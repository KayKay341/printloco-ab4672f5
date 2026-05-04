// Research-backed cost estimator. Combines deterministic local math with an
// AI-researched market price range, enforces a $2.00 minimum, and caches
// results by spec hash so identical jobs don't re-hit the model.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_PRICE_CENTS = 200; // hard $2.00 floor
const CACHE_TTL_DAYS = 7;

type Service = "3d_print" | "laser_cut" | "embroidery" | "cnc" | "vinyl";

type EstimateRequest = {
  service: Service;
  material?: string;
  quantity?: number;
  // Geometry inputs (any subset; service-dependent)
  weightG?: number;          // 3D / CNC
  printMinutes?: number;     // 3D / CNC
  bboxMm?: { x: number; y: number; z: number };
  cutLengthMm?: number;      // laser, vinyl
  engraveAreaMm2?: number;   // laser
  stitchCount?: number;      // embroidery
  colorChanges?: number;     // embroidery
  areaMm2?: number;          // vinyl
  rush?: boolean;
  research?: boolean;        // when true, also call the AI for market range
};

// ---------- Local pricing math ----------

function localEstimateCents(req: EstimateRequest): {
  cents: number;
  breakdown: Array<{ label: string; cents: number }>;
} {
  const qty = Math.max(1, Math.min(1000, Math.floor(req.quantity ?? 1)));
  const breakdown: Array<{ label: string; cents: number }> = [];

  const add = (label: string, cents: number) => {
    if (cents > 0) breakdown.push({ label, cents: Math.round(cents) });
  };

  let total = 0;

  switch (req.service) {
    case "3d_print": {
      const ppg = materialPricePerGram(req.material) ?? 0.2;
      const matCost = (req.weightG ?? 0) * ppg;
      const machineCost = ((req.printMinutes ?? 0) / 60) * 1.5; // $1.50/hr machine
      const setup = 0.75;
      add("Material", matCost * 100);
      add("Machine time", machineCost * 100);
      add("Setup", setup * 100);
      total = (matCost + machineCost + setup) * qty;
      break;
    }
    case "laser_cut": {
      const cut = (req.cutLengthMm ?? 0) / 1000; // m
      const cutRate = laserCutRatePerMeter(req.material); // $/m
      const engrave = (req.engraveAreaMm2 ?? 0) / 1_000_000; // m²
      const engraveRate = 12; // $/m² engraved
      const matArea = (req.areaMm2 ?? boxArea(req.bboxMm)) / 1_000_000;
      const sheetCost = matArea * sheetPricePerM2(req.material);
      const setup = 1.5;
      add("Material/sheet", sheetCost * 100);
      add("Cut path", cut * cutRate * 100);
      add("Engraving", engrave * engraveRate * 100);
      add("Setup", setup * 100);
      total = (sheetCost + cut * cutRate + engrave * engraveRate + setup) * qty;
      break;
    }
    case "embroidery": {
      const k = (req.stitchCount ?? 0) / 1000;
      const perK = 0.85; // $/1k stitches
      const hooping = 2.0;
      const colorFee = 0.5 * Math.max(0, (req.colorChanges ?? 1) - 1);
      add("Stitches", k * perK * 100);
      add("Hooping", hooping * 100);
      add("Color changes", colorFee * 100);
      total = (k * perK + hooping + colorFee) * qty;
      break;
    }
    case "cnc": {
      const mins = req.printMinutes ?? 0;
      const machine = (mins / 60) * 18; // $18/hr CNC
      const stockArea = (req.areaMm2 ?? boxArea(req.bboxMm)) / 1_000_000;
      const stock = stockArea * cncStockPerM2(req.material);
      const tooling = (mins / 60) * 1.0;
      const setup = 5;
      add("Stock", stock * 100);
      add("Machine time", machine * 100);
      add("Tooling wear", tooling * 100);
      add("Setup", setup * 100);
      total = (stock + machine + tooling + setup) * qty;
      break;
    }
    case "vinyl": {
      const area = (req.areaMm2 ?? 0) / 1_000_000;
      const rate = 25; // $/m²
      const cut = (req.cutLengthMm ?? 0) / 1000 * 0.4;
      const weeding = Math.min(5, ((req.cutLengthMm ?? 0) / 1000) * 0.1);
      const setup = 1;
      add("Vinyl media", area * rate * 100);
      add("Cut path", cut * 100);
      add("Weeding", weeding * 100);
      add("Setup", setup * 100);
      total = (area * rate + cut + weeding + setup) * qty;
      break;
    }
  }

  if (req.rush) {
    total *= 1.25;
    add("Rush 24h (+25%)", total * 100 * (0.25 / 1.25));
  }

  // Platform fee + payment processing baked in
  total *= 1.1;

  const cents = Math.max(MIN_PRICE_CENTS, Math.round(total * 100));
  return { cents, breakdown };
}

function materialPricePerGram(m?: string): number | undefined {
  const map: Record<string, number> = {
    PLA: 0.06, PETG: 0.07, ABS: 0.07, TPU: 0.12, ASA: 0.09,
    Nylon: 0.18, "PA-CF": 0.45, Resin: 0.25,
  };
  return m ? map[m] : undefined;
}
function laserCutRatePerMeter(m?: string): number {
  const map: Record<string, number> = {
    "Plywood 3mm": 0.8, "Plywood 6mm": 1.4, "MDF 3mm": 0.7, "MDF 6mm": 1.3,
    "Acrylic 3mm": 1.0, "Acrylic 6mm": 2.0, Cardboard: 0.3, Leather: 1.1,
  };
  return m ? map[m] ?? 1.0 : 1.0;
}
function sheetPricePerM2(m?: string): number {
  const map: Record<string, number> = {
    "Plywood 3mm": 35, "Plywood 6mm": 55, "MDF 3mm": 18, "MDF 6mm": 28,
    "Acrylic 3mm": 80, "Acrylic 6mm": 140, Cardboard: 6, Leather: 90,
  };
  return m ? map[m] ?? 40 : 40;
}
function cncStockPerM2(m?: string): number {
  const map: Record<string, number> = {
    Aluminum: 280, Brass: 520, Wood: 60, Plastic: 90, Steel: 320,
  };
  return m ? map[m] ?? 120 : 120;
}
function boxArea(b?: { x: number; y: number; z: number }): number {
  if (!b) return 0;
  return b.x * b.y; // top-down area in mm²
}

// ---------- Spec hashing for cache ----------

async function specHash(req: EstimateRequest): Promise<string> {
  const norm = JSON.stringify({
    s: req.service,
    m: req.material ?? null,
    q: req.quantity ?? 1,
    w: round(req.weightG, 1),
    t: round(req.printMinutes, 1),
    b: req.bboxMm ? {
      x: round(req.bboxMm.x, 0), y: round(req.bboxMm.y, 0), z: round(req.bboxMm.z, 0),
    } : null,
    cl: round(req.cutLengthMm, 0),
    ea: round(req.engraveAreaMm2, 0),
    sc: req.stitchCount ?? null,
    cc: req.colorChanges ?? null,
    a: round(req.areaMm2, 0),
    r: !!req.rush,
  });
  const buf = new TextEncoder().encode(norm);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function round(n: number | undefined, decimals: number): number | null {
  if (n === undefined || n === null || !Number.isFinite(n)) return null;
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ---------- AI research call ----------

async function researchMarketPrice(req: EstimateRequest): Promise<{
  marketLowCents: number;
  marketTypicalCents: number;
  marketHighCents: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  sources: string[];
} | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const sys = `You are a pricing analyst for a maker marketplace covering 3D printing, laser cutting, embroidery, CNC machining, and vinyl/sticker cutting. Estimate fair retail market pricing in US dollars based on comparable shops (Etsy maker shops, local hackerspaces, Sculpteo, Ponoko, Xometry, JLCPCB, etc.) given the job specs. Be realistic — small jobs have minimums around $2-5. Return prices as cents (integers). Do not refuse; estimate from your training knowledge.`;

  const userMsg = JSON.stringify({
    service: req.service,
    material: req.material,
    quantity: req.quantity ?? 1,
    weight_grams: req.weightG,
    print_minutes: req.printMinutes,
    bbox_mm: req.bboxMm,
    cut_length_mm: req.cutLengthMm,
    engrave_area_mm2: req.engraveAreaMm2,
    stitch_count: req.stitchCount,
    color_changes: req.colorChanges,
    area_mm2: req.areaMm2,
    rush: req.rush,
  });

  const body = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: `Job specs:\n${userMsg}\n\nReturn fair market price range.` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "report_market_price",
        description: "Return fair market price range in US cents.",
        parameters: {
          type: "object",
          properties: {
            market_low_cents: { type: "integer", description: "Lowest fair price a hobbyist maker would charge, in US cents." },
            market_typical_cents: { type: "integer", description: "Typical price across small shops, in US cents." },
            market_high_cents: { type: "integer", description: "Premium / professional shop price, in US cents." },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            rationale: { type: "string", description: "2-3 sentence explanation referencing comparable shops or rules of thumb." },
            sources: { type: "array", items: { type: "string" }, description: "Names of comparable shops or pricing references used." },
          },
          required: ["market_low_cents", "market_typical_cents", "market_high_cents", "confidence", "rationale", "sources"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "report_market_price" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("AI gateway error", resp.status, txt);
    if (resp.status === 429) throw new Error("RATE_LIMITED");
    if (resp.status === 402) throw new Error("PAYMENT_REQUIRED");
    return null;
  }

  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) return null;
  let args: any;
  try { args = JSON.parse(call.function.arguments); } catch { return null; }

  return {
    marketLowCents: Math.max(MIN_PRICE_CENTS, Math.round(args.market_low_cents ?? 0)),
    marketTypicalCents: Math.max(MIN_PRICE_CENTS, Math.round(args.market_typical_cents ?? 0)),
    marketHighCents: Math.max(MIN_PRICE_CENTS, Math.round(args.market_high_cents ?? 0)),
    confidence: args.confidence ?? "medium",
    rationale: String(args.rationale ?? ""),
    sources: Array.isArray(args.sources) ? args.sources.slice(0, 6).map(String) : [],
  };
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: EstimateRequest = await req.json();
    if (!body?.service) {
      return json({ error: "service is required" }, 400);
    }

    const local = localEstimateCents(body);
    const minApplied = local.cents <= MIN_PRICE_CENTS;

    if (!body.research) {
      return json({
        finalCents: local.cents,
        localCents: local.cents,
        breakdown: local.breakdown,
        minimumApplied: minApplied,
        market: null,
      });
    }

    // Research path: check cache first
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const hash = await specHash(body);

    const { data: cached } = await supabase
      .from("estimate_cache")
      .select("payload, created_at")
      .eq("spec_hash", hash)
      .maybeSingle();

    let market = null as Awaited<ReturnType<typeof researchMarketPrice>>;
    if (cached) {
      const ageDays = (Date.now() - new Date(cached.created_at).getTime()) / 86_400_000;
      if (ageDays < CACHE_TTL_DAYS) {
        market = cached.payload as any;
      }
    }

    if (!market) {
      try {
        market = await researchMarketPrice(body);
      } catch (e: any) {
        if (e?.message === "RATE_LIMITED") {
          return json({ error: "Rate limited, please try again in a moment." }, 429);
        }
        if (e?.message === "PAYMENT_REQUIRED") {
          return json({ error: "AI credits exhausted — add credits in Settings → Workspace → Usage." }, 402);
        }
        throw e;
      }
      if (market) {
        await supabase.from("estimate_cache").insert({
          spec_hash: hash,
          service: body.service,
          payload: market,
        });
      }
    }

    // Blend: clamp local estimate to [low*0.9, high*1.1], never below $2.
    let finalCents = local.cents;
    if (market) {
      const lo = Math.round(market.marketLowCents * 0.9);
      const hi = Math.round(market.marketHighCents * 1.1);
      finalCents = Math.min(Math.max(local.cents, lo), hi);
    }
    finalCents = Math.max(MIN_PRICE_CENTS, finalCents);

    return json({
      finalCents,
      localCents: local.cents,
      breakdown: local.breakdown,
      minimumApplied: finalCents <= MIN_PRICE_CENTS,
      market,
    });
  } catch (e: any) {
    console.error("estimate-cost error", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
