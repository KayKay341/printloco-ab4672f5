import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

/**
 * Triggers a "your city is live" announcement to everyone on a city's waitlist.
 *
 * Email infrastructure:
 *   This function ENQUEUES the announcements. Actual delivery happens via the
 *   Lovable email queue once the project's sender domain is configured. If
 *   the queue tables don't exist yet (no domain configured), the function
 *   logs the recipients and returns the count without erroring — admins can
 *   still flip a city to "live" and the queue will catch up once email is wired.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid auth" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const { citySlug } = await req.json();
    if (!citySlug) return json({ error: "citySlug required" }, 400);

    const { data: city } = await admin
      .from("cities")
      .select("*")
      .eq("slug", citySlug)
      .maybeSingle();
    if (!city) return json({ error: "City not found" }, 404);

    const { data: signups, error: sErr } = await admin
      .from("waitlist_signups")
      .select("email, city, zip_code")
      .or(`city.ilike.${city.slug},city.ilike.${city.name}`);
    if (sErr) throw sErr;

    let queued = 0;
    for (const s of signups ?? []) {
      try {
        const r = await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "city-launch-announcement",
            recipientEmail: s.email,
            idempotencyKey: `city-launch-${city.slug}-${s.email}`,
            templateData: { cityName: city.name },
          },
        });
        if (!r.error) queued++;
      } catch (e) {
        console.warn("enqueue failed (likely no email infra yet)", e);
      }
    }

    // Flip city to live
    await admin.from("cities").update({ status: "live" }).eq("id", city.id);

    return json({ ok: true, queued, total: signups?.length ?? 0 });
  } catch (err: any) {
    console.error("notify-city-waitlist error", err);
    return json({ error: err.message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
