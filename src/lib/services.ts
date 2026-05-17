/**
 * Central registry for every service PrintLoco supports.
 * One source of truth for icons, accepted file types, materials, and copy.
 */
import {
  Box,
  Flame,
  Scissors,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type ServiceId = "3d-print" | "laser-cut" | "embroidery" | "vinyl";
export type PreviewKind = "stl" | "svg" | "embroidery";

export type ServiceDef = {
  id: ServiceId;
  /** Maps to DB enum value */
  dbKey: "3d_print" | "laser_cut" | "embroidery" | "vinyl";
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
  acceptedFiles: string[];
  fileHint: string;
  materials: string[];
  qualityPresets: { id: string; name: string; description: string; emoji: string }[];
  previewKind: PreviewKind;
  /** Tailwind gradient classes for service cards */
  gradient: string;
  startingPriceCents: number;
};

export const SERVICES: ServiceDef[] = [
  {
    id: "3d-print",
    dbKey: "3d_print",
    name: "3D Printing",
    shortName: "3D Print",
    tagline: "Functional parts, prototypes & figurines.",
    description: "Upload an STL or 3MF and get a real quote in seconds. Perfect for replacement parts, custom brackets, miniatures, and prototypes.",
    icon: Box,
    emoji: "🧊",
    acceptedFiles: [".stl", ".3mf", ".obj"],
    fileHint: "STL, 3MF or OBJ — up to 500 MB",
    materials: ["PLA", "PETG", "ABS", "TPU", "PLA+", "Nylon"],
    qualityPresets: [
      { id: "draft", name: "Quick Draft", description: "Fastest, for fit testing", emoji: "⚡" },
      { id: "standard", name: "Standard", description: "Balanced quality + speed", emoji: "✨" },
      { id: "fine", name: "Fine Detail", description: "Crisp surfaces, slow", emoji: "💎" },
    ],
    previewKind: "stl",
    gradient: "from-orange-500/20 via-rose-500/10 to-amber-500/20",
    startingPriceCents: 200,
  },
  {
    id: "laser-cut",
    dbKey: "laser_cut",
    name: "Laser Cutting",
    shortName: "Laser Cut",
    tagline: "Precise flat parts in wood, acrylic & more.",
    description: "Send an SVG, DXF, or PDF. Red lines cut, black lines engrave. Great for signage, jewelry, packaging, and enclosures.",
    icon: Flame,
    emoji: "🔥",
    acceptedFiles: [".svg", ".dxf", ".pdf", ".ai", ".eps", ".xcs", ".lbrn", ".lbrn2", ".dwg", ".png", ".jpg", ".jpeg"],
    fileHint: "SVG, DXF, PDF, AI, EPS, xTool (.xcs), LightBurn (.lbrn) or raster (PNG/JPG)",
    materials: ["Plywood 3mm", "Plywood 6mm", "Acrylic 3mm", "Acrylic 6mm", "MDF 3mm", "Cardboard"],
    qualityPresets: [
      { id: "fast", name: "Fast Cut", description: "Production speed", emoji: "⚡" },
      { id: "clean", name: "Clean Edge", description: "Less charring", emoji: "✨" },
      { id: "engrave", name: "Engrave + Cut", description: "Mixed operations", emoji: "🖋️" },
    ],
    previewKind: "svg",
    gradient: "from-red-500/20 via-orange-500/10 to-yellow-500/20",
    startingPriceCents: 200,
  },
  {
    id: "embroidery",
    dbKey: "embroidery",
    name: "Embroidery",
    shortName: "Embroidery",
    tagline: "Custom patches, logos & wearables.",
    description: "Upload a DST or PES file (or send us a PNG/SVG and we'll digitize it). Great for hats, jackets, patches, and tote bags.",
    icon: Sparkles,
    emoji: "🧵",
    acceptedFiles: [".dst", ".pes", ".exp", ".png", ".svg"],
    fileHint: "DST, PES, EXP — or art to digitize",
    materials: ["Cotton tee", "Polo shirt", "Cap", "Patch backing", "Tote bag", "Hoodie"],
    qualityPresets: [
      { id: "standard", name: "Standard", description: "Up to 6 thread colors", emoji: "🧵" },
      { id: "premium", name: "Premium", description: "Unlimited colors + 3D puff", emoji: "💎" },
    ],
    previewKind: "embroidery",
    gradient: "from-pink-500/20 via-fuchsia-500/10 to-purple-500/20",
    startingPriceCents: 200,
  },
  {
    id: "vinyl",
    dbKey: "vinyl",
    name: "Vinyl & Stickers",
    shortName: "Vinyl",
    tagline: "Custom decals, shirts & signage.",
    description: "Upload an SVG or PDF. We'll cut adhesive vinyl, heat-transfer for shirts, or print-and-cut full color stickers.",
    icon: Scissors,
    emoji: "✂️",
    acceptedFiles: [".svg", ".pdf", ".png"],
    fileHint: "SVG or PDF — single color cuts work best",
    materials: ["Adhesive vinyl", "HTV (shirts)", "Reflective", "Glitter HTV", "Print + cut sticker"],
    qualityPresets: [
      { id: "standard", name: "Standard", description: "Single-color cut", emoji: "✂️" },
      { id: "fullcolor", name: "Full Color", description: "Print + cut stickers", emoji: "🌈" },
    ],
    previewKind: "svg",
    gradient: "from-cyan-500/20 via-sky-500/10 to-blue-500/20",
    startingPriceCents: 200,
  },
];

export function getService(id: string | undefined): ServiceDef | undefined {
  return SERVICES.find((s) => s.id === id);
}
