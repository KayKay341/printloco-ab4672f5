import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("MAPTILER_API_KEY");
    if (!token) throw new Error("MAPTILER_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { printerId, address } = await req.json();
    if (!printerId || !address || typeof address !== "string" || address.length < 5) {
      throw new Error("printerId and address required");
    }

    // Verify the user owns this printer
    const { data: printer } = await supabase
      .from("printers")
      .select("owner_id")
      .eq("id", printerId)
      .single();
    if (!printer || printer.owner_id !== userData.user.id) {
      throw new Error("Forbidden");
    }

    // Geocode via MapTiler
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${token}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature) throw new Error("Address not found");

    const [lng, lat] = feature.center;
    const place = feature.place_name || address;
    const ctx = feature.context || [];
    const city = ctx.find((c: any) => c.id?.startsWith("place"))?.text ?? null;
    const zip = ctx.find((c: any) => c.id?.startsWith("postal"))?.text ?? null;

    const { error: updErr } = await supabase
      .from("printers")
      .update({
        address: place,
        city,
        zip_code: zip,
        latitude: lat,
        longitude: lng,
        is_address_verified: true,
      })
      .eq("id", printerId);
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ ok: true, latitude: lat, longitude: lng, address: place, city, zip_code: zip }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
