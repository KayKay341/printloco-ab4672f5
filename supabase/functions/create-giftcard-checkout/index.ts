import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      amountCents,
      purchaserEmail,
      purchaserName,
      deliveryMethod, // 'buyer' | 'recipient'
      recipientEmail,
      recipientName,
      personalMessage,
      scheduledSendAt,
      returnUrl,
      environment,
    } = body;

    // ---- validation ----
    const amt = Number(amountCents);
    if (!Number.isInteger(amt) || amt < 500 || amt > 50000000) {
      return new Response(
        JSON.stringify({ error: "Amount must be between $5 and $500,000" }),
        { status: 400, headers: corsHeaders },
      );
    }
    if (!purchaserEmail || !EMAIL_RE.test(String(purchaserEmail))) {
      return new Response(JSON.stringify({ error: "Valid purchaser email is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    const method = deliveryMethod === "recipient" ? "recipient" : "buyer";
    if (method === "recipient") {
      if (!recipientEmail || !EMAIL_RE.test(String(recipientEmail))) {
        return new Response(
          JSON.stringify({ error: "Recipient email is required when sending to recipient" }),
          { status: 400, headers: corsHeaders },
        );
      }
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try to associate to a logged-in user (optional)
    let purchaserUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      if (data.user) purchaserUserId = data.user.id;
    }

    // Create the pending gift card row first (so webhook can correlate)
    const code = generateGiftCardCode();
    const { data: card, error: cardErr } = await supabase
      .from("gift_cards")
      .insert({
        code,
        original_amount_cents: amt,
        remaining_amount_cents: amt,
        currency: "usd",
        status: "pending",
        purchaser_user_id: purchaserUserId,
        purchaser_email: String(purchaserEmail).toLowerCase().trim(),
        recipient_email: method === "recipient" ? String(recipientEmail).toLowerCase().trim() : null,
        recipient_name: recipientName ? String(recipientName).slice(0, 200) : null,
        sender_name: purchaserName ? String(purchaserName).slice(0, 200) : null,
        personal_message: personalMessage ? String(personalMessage).slice(0, 1000) : null,
        delivery_method: method,
        scheduled_send_at: scheduledSendAt || null,
        environment: env,
      })
      .select("id, code")
      .single();

    if (cardErr) throw cardErr;

    const recipientLine =
      method === "recipient" && recipientName
        ? ` for ${recipientName}`
        : method === "recipient"
        ? ` for ${recipientEmail}`
        : "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amt,
            product_data: {
              name: `PrintLoco Gift Card${recipientLine}`,
              description: `Digital gift card · $${(amt / 100).toFixed(2)}`,
            },
          },
          quantity: 1,
        },
      ],
      return_url:
        returnUrl ||
        `${req.headers.get("origin")}/gift-cards/return?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: String(purchaserEmail),
      metadata: {
        kind: "gift_card",
        giftCardId: card.id,
      },
      payment_intent_data: {
        metadata: {
          kind: "gift_card",
          giftCardId: card.id,
        },
      },
    });

    await supabase
      .from("gift_cards")
      .update({ stripe_session_id: session.id })
      .eq("id", card.id);

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, giftCardId: card.id }),
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error("create-giftcard-checkout error", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// Generates a code like "PL-AB12-CD34-EF56"
function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) => {
    let out = "";
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
    return out;
  };
  return `PL-${seg(4)}-${seg(4)}-${seg(4)}`;
}
