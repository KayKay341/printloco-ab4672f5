// Smart printer matching: blends price, distance, material match, and color match.
// Returns a 0-100 score. Higher is better.

export type PrinterForScore = {
  id: string;
  price_per_gram: number;
  materials: string[];
  latitude: number | null;
  longitude: number | null;
  filament_colors?: { material: string; color_name: string; hex_code: string; in_stock: boolean }[];
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
  const totalPrice = Number(p.price_per_gram) * input.weightG;
  const hasMaterial = p.materials.includes(input.material);

  const colorMatch = input.colorName
    ? (p.filament_colors ?? []).find(
        (c) => c.material === input.material && c.color_name === input.colorName && c.in_stock
      )
    : null;
  const hasColor = !!colorMatch;
  const matchedHex = colorMatch?.hex_code ?? null;

  let distanceKm: number | null = null;
  if (input.customerLat != null && input.customerLng != null && p.latitude != null && p.longitude != null) {
    distanceKm = haversineKm(input.customerLat, input.customerLng, p.latitude, p.longitude);
  }

  // Score components 0..1
  // Price: normalize against a $40 reference. 0 -> 1, $40+ -> 0.
  const priceScore = Math.max(0, 1 - totalPrice / 40);
  // Distance: 0km -> 1, 30km+ -> 0. If unknown, 0.5.
  const distScore = distanceKm == null ? 0.5 : Math.max(0, 1 - distanceKm / 30);
  const matScore = hasMaterial ? 1 : 0;
  const colScore = input.colorName ? (hasColor ? 1 : 0) : 0.6;

  const score = Math.round(
    100 * (0.35 * priceScore + 0.25 * distScore + 0.25 * matScore + 0.15 * colScore)
  );

  return { totalPrice, distanceKm, hasMaterial, hasColor, matchedHex, score };
}
