import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://printloco.shop";

function pickupCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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
        await handlePrintOrderPaid(session);
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

async function handlePrintOrderPaid(session: any) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.warn("Print session missing orderId metadata", session.id);
    return;
  }

  const code = pickupCode();

  // Mark the order paid and stamp the pickup code.
  const { data: order, error: updErr } = await supabase
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: session.payment_intent ?? null,
      pickup_code: code,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select(
      "id, customer_id, maker_id, printer_id, material, quantity, amount_total, platform_fee, notes, pickup_code",
    )
    .single();

  if (updErr || !order) {
    console.error("Failed to mark order paid", updErr);
    return;
  }

  // Pull related data in parallel.
  const [{ data: customerProfile }, { data: makerProfile }, { data: printer }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", order.customer_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", order.maker_id).maybeSingle(),
      order.printer_id
        ? supabase.from("printers").select("brand, model").eq("id", order.printer_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // Resolve emails via the auth admin API (service role).
  const [{ data: customerUser }, { data: makerUser }] = await Promise.all([
    supabase.auth.admin.getUserById(order.customer_id),
    supabase.auth.admin.getUserById(order.maker_id),
  ]);

  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    customerUser?.user?.email ||
    null;
  const makerEmail = makerUser?.user?.email ?? null;

  // Best-effort: parse "Color: X · ..." prefix the checkout writes into notes.
  let colorName: string | undefined;
  let cleanNotes: string | undefined;
  if (order.notes) {
    const parts = order.notes.split(" · ");
    const colorPart = parts.find((p: string) => p.toLowerCase().startsWith("color:"));
    if (colorPart) colorName = colorPart.slice(colorPart.indexOf(":") + 1).trim();
    cleanNotes = parts
      .filter((p: string) => !p.toLowerCase().startsWith("color:"))
      .join(" · ") || undefined;
  }

  const printerLabel = printer ? `${printer.brand ?? ""} ${printer.model ?? ""}`.trim() : undefined;
  const totalFormatted = formatUsd(order.amount_total);
  const payoutFormatted = formatUsd(Math.max(0, order.amount_total - (order.platform_fee ?? 0)));

  // Customer receipt
  if (customerEmail) {
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "print-order-receipt",
          recipientEmail: customerEmail,
          templateData: {
            amountFormatted: totalFormatted,
            material: order.material,
            colorName,
            quantity: order.quantity,
            makerName: makerProfile?.full_name || "your local maker",
            printerLabel,
            pickupCode: order.pickup_code ?? code,
            orderId: order.id,
          },
        },
      });
    } catch (e) {
      console.error("Failed to send customer receipt", e);
    }
  } else {
    console.warn("No customer email on file for order", order.id);
  }

  // Maker notification
  if (makerEmail) {
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "maker-new-order",
          recipientEmail: makerEmail,
          templateData: {
            payoutFormatted,
            totalFormatted,
            material: order.material,
            colorName,
            quantity: order.quantity,
            customerName: customerProfile?.full_name || undefined,
            printerLabel,
            pickupCode: order.pickup_code ?? code,
            orderId: order.id,
            notes: cleanNotes,
            dashboardUrl: `${SITE_URL}/dashboard`,
          },
        },
      });
    } catch (e) {
      console.error("Failed to send maker notification", e);
    }
  } else {
    console.warn("No maker email on file for order", order.id);
  }
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
