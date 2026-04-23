// Public waitlist endpoint. Uses the service role to insert so RLS / per-account
// auth quirks can never block sign-ups. Validation mirrors the original RLS
// check so the contract for legitimate inserts is identical.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ALLOWED_ROLES = new Set(["customer", "maker", "nonprofit"]);

const generateCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = (body?.email ?? "").trim().toLowerCase();
  const role = (body?.role ?? "customer").toString();

  if (!email || email.length < 3 || email.length > 320 || !EMAIL_RE.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  if (!ALLOWED_ROLES.has(role)) {
    return json({ error: "Invalid role." }, 400);
  }

  const referralCode = (body?.referral_code ?? "").toString().trim() || generateCode();
  const referredBy = body?.referred_by ? String(body.referred_by).trim() : null;
  const zip = body?.zip_code ? String(body.zip_code).trim().slice(0, 12) : null;
  const city = body?.city ? String(body.city).trim().slice(0, 120) : null;
  const notes = body?.notes ? String(body.notes).slice(0, 2000) : null;
  const source = body?.source ? String(body.source).slice(0, 80) : "waitlist_page";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // If the email already exists, treat it as success and return their existing code.
  const { data: existing } = await supabase
    .from("waitlist_signups")
    .select("referral_code")
    .eq("email", email)
    .maybeSingle();

  if (existing?.referral_code) {
    return json({
      ok: true,
      alreadyJoined: true,
      referral_code: existing.referral_code,
    });
  }

  const { error } = await supabase.from("waitlist_signups").insert({
    email,
    role,
    zip_code: zip,
    city,
    notes,
    source,
    referred_by: referredBy,
    referral_code: referralCode,
  });

  if (error) {
    if (error.code === "23505") {
      return json({ ok: true, alreadyJoined: true, referral_code: referralCode });
    }
    console.error("join-waitlist insert failed", error);
    return json({ error: "Could not join the waitlist. Please try again." }, 500);
  }

  // Fire-and-forget confirmation email.
  supabase.functions
    .invoke("send-transactional-email", {
      body: {
        templateName: "waitlist-confirmation",
        recipientEmail: email,
        idempotencyKey: `waitlist-confirm-${referralCode}`,
        templateData: {
          name: email.split("@")[0],
          city: city ?? undefined,
          role,
          referralCode,
        },
      },
    })
    .catch((err) => console.warn("confirmation email failed", err));

  return json({ ok: true, referral_code: referralCode });
});
