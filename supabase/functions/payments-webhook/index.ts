import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function pickupCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const kind = session.metadata?.kind;

      if (kind === "gift_card") {
        await handleGiftCardPaid(session);
      } else {
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await supabase
            .from("orders")
            .update({
              status: "paid",
              stripe_payment_intent_id: session.payment_intent ?? null,
              pickup_code: pickupCode(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook error:", e.message);
    return new Response("Webhook error", { status: 400 });
  }
});

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function handleGiftCardPaid(session: any) {
  const giftCardId = session.metadata?.giftCardId;
  if (!giftCardId) {
    console.warn("Gift card session missing giftCardId metadata", session.id);
    return;
  }

  // Activate the card
  const { data: card, error: updErr } = await supabase
    .from("gift_cards")
    .update({
      status: "active",
      stripe_payment_intent_id: session.payment_intent ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", giftCardId)
    .select(
      "id, code, original_amount_cents, purchaser_email, recipient_email, recipient_name, sender_name, personal_message, delivery_method, scheduled_send_at",
    )
    .single();

  if (updErr || !card) {
    console.error("Failed to activate gift card", updErr);
    return;
  }

  const amountFormatted = formatUsd(card.original_amount_cents);

  // Send receipt to purchaser
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "gift-card-purchase-receipt",
        recipientEmail: card.purchaser_email,
        templateData: {
          amountFormatted,
          code: card.code,
          recipientEmail: card.recipient_email,
          deliveryMethod: card.delivery_method,
        },
      },
    });
  } catch (e) {
    console.error("Failed to send purchase receipt", e);
  }

  // Send to recipient if requested and not scheduled for later
  const shouldSendNow =
    card.delivery_method === "recipient" &&
    !!card.recipient_email &&
    (!card.scheduled_send_at || new Date(card.scheduled_send_at) <= new Date());

  if (shouldSendNow) {
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "gift-card-delivery",
          recipientEmail: card.recipient_email,
          templateData: {
            recipientName: card.recipient_name ?? undefined,
            senderName: card.sender_name ?? undefined,
            amountFormatted,
            code: card.code,
            personalMessage: card.personal_message ?? undefined,
          },
        },
      });
      await supabase
        .from("gift_cards")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", card.id);
    } catch (e) {
      console.error("Failed to deliver gift card to recipient", e);
    }
  }
}
