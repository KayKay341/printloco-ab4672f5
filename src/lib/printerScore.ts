// Smart printer matching: blends price, distance, material, color, AND
// quality score. Returns a 0-100 score plus a transparent "why this rank"
// reason string so customers always see why a maker is recommended (3D Hubs
// failure cause #5: opaque automated selection alienated everyone).

export type PrinterForScore = {
  id: string;
  price_per_gram: number;
  materials: string[];
  latitude: number | null;
  longitude: number | null;
  /** Optional per-material base price ($/g) — overrides price_per_gram when present. */
  material_prices?: Record<string, number> | null;
  filament_colors?: {
    material: string;
    color_name: string;
    hex_code: string;
    in_stock: boolean;
    surcharge_per_gram?: number;
  }[];
  /** Quality score 0-100 from server (defaults 50). */
  quality_score?: number;
  /** Avg star rating 0-5. */
  avg_rating?: number;
  rating_count?: number;
};

export type ScoreInput = {
  weightG: number;
  material: string;
  colorName?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
};

export type ScoredPrinter = {
  totalPrice: number;
  distanceKm: number | null;
  hasMaterial: boolean;
  hasColor: boolean;
  matchedHex: string | null;
  score: number;
  /** Plain-English reason for the ranking, e.g. "Closest · top-rated". */
  reason: string;
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function scorePrinter(p: PrinterForScore, input: ScoreInput): ScoredPrinter {
  const basePrice =
    (p.material_prices && p.material_prices[input.material]) ?? Number(p.price_per_gram);
  const hasMaterial = p.materials.includes(input.material);

  const colorMatch = input.colorName
    ? (p.filament_colors ?? []).find(
        (c) => c.material === input.material && c.color_name === input.colorName && c.in_stock
      )
    : null;
  const hasColor = !!colorMatch;
  const matchedHex = colorMatch?.hex_code ?? null;
  const colorSurcharge = colorMatch?.surcharge_per_gram ?? 0;
  const totalPrice = (basePrice + Number(colorSurcharge)) * input.weightG;

  let distanceKm: number | null = null;
  if (input.customerLat != null && input.customerLng != null && p.latitude != null && p.longitude != null) {
    distanceKm = haversineKm(input.customerLat, input.customerLng, p.latitude, p.longitude);
  }

  // 0..1 components
  const priceScore = Math.max(0, 1 - totalPrice / 40);
  const distScore = distanceKm == null ? 0.5 : Math.max(0, 1 - distanceKm / 30);
  const matScore = hasMaterial ? 1 : 0;
  const colScore = input.colorName ? (hasColor ? 1 : 0) : 0.6;
  const qualityScore = (p.quality_score ?? 50) / 100;

  const score = Math.round(
    100 * (
      0.30 * priceScore +
      0.20 * distScore +
      0.20 * matScore +
      0.10 * colScore +
      0.20 * qualityScore
    )
  );

  // Transparent ranking reason — show whichever components are strongest
  const reasons: string[] = [];
  if (distanceKm != null && distanceKm < 3) reasons.push("Closest");
  else if (distanceKm != null && distanceKm < 8) reasons.push("Nearby");
  if ((p.quality_score ?? 0) >= 85) reasons.push("Professional grade");
  else if ((p.quality_score ?? 0) >= 60) reasons.push("Verified maker");
  if (priceScore > 0.7) reasons.push("Low price");
  if ((p.avg_rating ?? 0) >= 4.7 && (p.rating_count ?? 0) >= 3) reasons.push("Top rated");
  if (hasColor) reasons.push("Color in stock");
  const reason = reasons.slice(0, 3).join(" · ") || (hasMaterial ? "Available" : "Material not stocked");

  return { totalPrice, distanceKm, hasMaterial, hasColor, matchedHex, score, reason };
}
