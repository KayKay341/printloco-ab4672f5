import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const PLATFORM_FEE_PCT = 0.10; // 10% goes to platform; rest is owed to maker

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      printerId,
      stlFileId,
      makerId,
      material,
      quantity = 1,
      amountCents, // total to charge customer in cents
      colorName,
      notes,
      customerId,
      customerEmail,
      returnUrl,
      environment,
    } = await req.json();

    if (!printerId || !makerId || !customerId || !amountCents || amountCents < 100) {
      return new Response(JSON.stringify({ error: "Missing or invalid params" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const platformFee = Math.round(amountCents * PLATFORM_FEE_PCT);

    // Create pending order so we can correlate via metadata
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        maker_id: makerId,
        printer_id: printerId,
        stl_file_id: stlFileId ?? null,
        material,
        quantity,
        amount_total: amountCents,
        platform_fee: platformFee,
        currency: "usd",
        status: "pending",
        notes: [colorName && `Color: ${colorName}`, notes].filter(Boolean).join(" · ") || null,
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `3D Print · ${material}${colorName ? ` · ${colorName}` : ""}`,
              description: `Local print job · qty ${quantity}`,
            },
          },
          quantity: 1,
        },
      ],
      return_url:
        returnUrl ||
        `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      ...(customerEmail && { customer_email: customerEmail }),
      metadata: {
        orderId: order.id,
        customerId,
        makerId,
        printerId,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          makerId,
        },
      },
    });

    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, orderId: order.id }),
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error("create-checkout error", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
