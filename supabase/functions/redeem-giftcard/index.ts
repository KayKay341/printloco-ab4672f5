import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sign in required to redeem" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.trim().length < 4) {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Use the user's JWT so the SECURITY DEFINER function sees auth.uid()
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data, error } = await supabase.rpc("redeem_gift_card", {
      _code: code.trim().toUpperCase(),
    });

    if (error) {
      const msg = String(error.message || "");
      let status = 400;
      if (msg.includes("Authentication")) status = 401;
      else if (msg.includes("not found")) status = 404;
      return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        success: true,
        redeemedAmountCents: row?.redeemed_amount_cents ?? 0,
        newBalanceCents: row?.new_balance_cents ?? 0,
        giftCardId: row?.gift_card_id ?? null,
      }),
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error("redeem-giftcard error", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
