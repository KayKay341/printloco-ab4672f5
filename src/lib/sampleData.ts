import { POPULAR_PRINTERS } from "./popularPrinters";

// Deterministic-ish PRNG so the demo data is stable across renders (same UUIDs
// each session) but still feels "random" between visits.
let seed = 1337;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => +(rand() * (max - min) + min).toFixed(2);

const COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#ffffff" },
  { name: "Red", hex: "#ef4444" },
  { name: "Orange", hex: "#f97316" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Green", hex: "#22c55e" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Silver", hex: "#cbd5e1" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Wood", hex: "#92400e" },
  { name: "Glow", hex: "#d9f99d" },
];

const ALL_MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Nylon", "Resin"];

// Santa Monica + LA neighborhoods with rough lat/lng centers
const LOCATIONS: { city: string; neighborhood: string; lat: number; lng: number }[] = [
  { city: "Santa Monica", neighborhood: "Ocean Park", lat: 34.0078, lng: -118.4828 },
  { city: "Santa Monica", neighborhood: "Sunset Park", lat: 34.0163, lng: -118.4720 },
  { city: "Santa Monica", neighborhood: "Mid-City", lat: 34.0286, lng: -118.4794 },
  { city: "Santa Monica", neighborhood: "Wilshire-Montana", lat: 34.0331, lng: -118.4987 },
  { city: "Santa Monica", neighborhood: "Pico", lat: 34.0224, lng: -118.4760 },
  { city: "Los Angeles", neighborhood: "Venice", lat: 33.9850, lng: -118.4695 },
  { city: "Los Angeles", neighborhood: "Mar Vista", lat: 34.0044, lng: -118.4337 },
  { city: "Los Angeles", neighborhood: "Culver City", lat: 34.0211, lng: -118.3965 },
  { city: "Los Angeles", neighborhood: "Silver Lake", lat: 34.0869, lng: -118.2702 },
  { city: "Los Angeles", neighborhood: "Echo Park", lat: 34.0782, lng: -118.2606 },
  { city: "Los Angeles", neighborhood: "Highland Park", lat: 34.1117, lng: -118.1925 },
  { city: "Los Angeles", neighborhood: "Atwater Village", lat: 34.1186, lng: -118.2620 },
  { city: "Los Angeles", neighborhood: "Eagle Rock", lat: 34.1395, lng: -118.2099 },
  { city: "Los Angeles", neighborhood: "DTLA Arts District", lat: 34.0407, lng: -118.2353 },
  { city: "Los Angeles", neighborhood: "Koreatown", lat: 34.0577, lng: -118.3008 },
  { city: "Los Angeles", neighborhood: "West Adams", lat: 34.0335, lng: -118.3344 },
  { city: "Los Angeles", neighborhood: "Hollywood", lat: 34.0928, lng: -118.3287 },
  { city: "Los Angeles", neighborhood: "Los Feliz", lat: 34.1064, lng: -118.2941 },
];

const NAMES = [
  "Ana K.", "Marcus T.", "Priya S.", "Diego R.", "Sasha L.", "Jordan W.",
  "Mei C.", "Ben H.", "Riya P.", "Tomás G.", "Noor A.", "Elena V.",
  "Kai M.", "Olivia B.", "Andre J.", "Hana Y.", "Luca F.", "Zara D.",
];

const BIOS = [
  "Print 7 days a week, fast turnaround on small parts.",
  "Specialize in cosplay props and miniatures. Color match available.",
  "Mech engineer by day. Tight tolerances, functional parts.",
  "Front porch pickup. I'll text you when it's ready.",
  "Multi-material rigs ready. PLA / PETG / TPU on tap.",
  "Resin shop — high detail jewelry and tabletop minis.",
  "Open evenings + weekends. Walking distance from the metro.",
  "Print farm with 4 machines. Bulk orders welcome.",
];

type FilamentColor = { material: string; color_name: string; hex_code: string; in_stock: boolean; surcharge_per_gram?: number };

export type SamplePrinter = {
  id: string;
  owner_id: string;
  brand: string;
  model: string;
  materials: string[];
  price_per_gram: number;
  material_prices: Record<string, number>;
  neighborhood: string | null;
  city: string | null;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  is_address_verified: boolean;
  has_ams: boolean;
  ams_slot_count: number;
  accepts_3mf: boolean;
  accepts_bulk: boolean;
  min_bulk_quantity: number;
  // Quality + verification (3D Hubs failure-mode safeguards)
  verification_status: "verified" | "pending" | "unverified";
  quality_score: number;
  tier: "hobbyist" | "maker" | "professional";
  avg_rating: number;
  rating_count: number;
  total_orders: number;
  successful_orders: number;
  printer_photo_url: string | null;
  sample_print_urls: string[];
  serial_visible: boolean;
  layer_height_min_mm: number;
  profiles: { full_name: string | null } | null;
  filament_colors: FilamentColor[];
};

let cached: SamplePrinter[] | null = null;

export const getSamplePrinters = (count = 24): SamplePrinter[] => {
  if (cached) return cached;
  // Reset seed so first generation is deterministic per session
  seed = 1337;
  const out: SamplePrinter[] = [];
  for (let i = 0; i < count; i++) {
    const printer = pick(POPULAR_PRINTERS);
    const loc = pick(LOCATIONS);
    // jitter coordinates so pins don't stack
    const lat = loc.lat + (rand() - 0.5) * 0.012;
    const lng = loc.lng + (rand() - 0.5) * 0.012;
    const isResin = /Photon|Mars|Saturn|Form/.test(printer.model);
    const matPool = isResin
      ? ["Resin"]
      : Array.from(new Set([
          "PLA",
          ...(rand() > 0.3 ? ["PETG"] : []),
          ...(rand() > 0.5 ? ["ABS"] : []),
          ...(rand() > 0.7 ? ["TPU"] : []),
          ...(rand() > 0.85 ? ["Nylon"] : []),
        ])) as string[];
    const colorCount = isResin ? 3 + Math.floor(rand() * 3) : 4 + Math.floor(rand() * 7);
    const usedColors = new Set<string>();
    const filament_colors: FilamentColor[] = [];
    for (let c = 0; c < colorCount; c++) {
      const col = pick(COLORS);
      const mat = pick(matPool);
      const key = `${mat}-${col.name}`;
      if (usedColors.has(key)) continue;
      usedColors.add(key);
      filament_colors.push({
        material: mat,
        color_name: col.name,
        hex_code: col.hex,
        in_stock: rand() > 0.1,
        // Specialty colors get a small surcharge to demo the new pricing model
        surcharge_per_gram: /Glow|Gold|Silver|Wood/.test(col.name) ? +between(0.05, 0.15) : 0,
      });
    }
    const isAms = /Bambu|Prusa MK4|Snapmaker/.test(printer.brand + " " + printer.model) && rand() > 0.3;
    const slotCount = isAms ? (pick([4, 4, 4, 8, 16]) as number) : 1;
    const materialPrices: Record<string, number> = {};
    matPool.forEach((m) => {
      materialPrices[m] = isResin
        ? between(0.45, 0.85)
        : m === "TPU" ? between(0.35, 0.55)
        : m === "Nylon" ? between(0.5, 0.75)
        : m === "PETG" ? between(0.18, 0.32)
        : between(0.12, 0.28);
    });
    out.push({
      id: `demo-${i}-${printer.brand.replace(/\s+/g, "")}-${printer.model.replace(/\s+/g, "")}`,
      owner_id: `demo-owner-${i}`,
      brand: printer.brand,
      model: printer.model,
      materials: matPool,
      price_per_gram: Math.min(...Object.values(materialPrices)),
      material_prices: materialPrices,
      neighborhood: loc.neighborhood,
      city: loc.city,
      bio: pick(BIOS),
      latitude: lat,
      longitude: lng,
      is_address_verified: rand() > 0.15,
      has_ams: isAms,
      ams_slot_count: slotCount,
      accepts_3mf: isAms,
      accepts_bulk: rand() > 0.2,
      min_bulk_quantity: pick([10, 20, 25, 50]) as number,
      profiles: { full_name: pick(NAMES) },
      filament_colors,
    });
  }
  cached = out;
  return out;
};

// --- Sample STL uploads for the customer / designer dashboard demo ---

export type SampleStl = {
  id: string;
  file_name: string;
  material: string;
  estimated_weight: number | null;
  estimated_price: number | null;
  created_at: string;
};

const SAMPLE_FILES = [
  { name: "drone_arm_v3.stl", mat: "PETG", g: 18 },
  { name: "phone_stand.stl", mat: "PLA", g: 42 },
  { name: "wall_hook_pair.stl", mat: "PLA", g: 11 },
  { name: "bike_light_mount.stl", mat: "ABS", g: 26 },
  { name: "succulent_planter.stl", mat: "PLA", g: 88 },
  { name: "controller_grip.stl", mat: "TPU", g: 34 },
  { name: "drawer_divider.stl", mat: "PLA", g: 67 },
  { name: "headphone_hanger.stl", mat: "PETG", g: 22 },
  { name: "warhammer_mini_x4.stl", mat: "Resin", g: 14 },
  { name: "replacement_knob.stl", mat: "PLA", g: 6 },
  { name: "cable_clip_x10.stl", mat: "PLA", g: 9 },
  { name: "keychain_logo.stl", mat: "PLA", g: 3 },
];

let cachedFiles: SampleStl[] | null = null;

export const getSampleStlFiles = (): SampleStl[] => {
  if (cachedFiles) return cachedFiles;
  seed = 4242;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  cachedFiles = SAMPLE_FILES.map((f, i) => {
    const ppg = f.mat === "Resin" ? between(0.5, 0.8) : between(0.15, 0.3);
    return {
      id: `demo-stl-${i}`,
      file_name: f.name,
      material: f.mat,
      estimated_weight: f.g,
      estimated_price: +(f.g * ppg).toFixed(2),
      created_at: new Date(now - i * day * (1 + rand() * 2)).toISOString(),
    };
  });
  return cachedFiles;
};
