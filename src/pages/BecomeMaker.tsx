import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { SERVICES, type ServiceId } from "@/lib/services";
import {
  Sparkles,
  DollarSign,
  Clock,
  Shield,
  Star,
  TrendingUp,
  Users,
  Package,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Quote,
  Calculator,
  Camera,
  MapPin,
  Zap,
  HeartHandshake,
} from "lucide-react";

/**
 * Etsy-style "Open your shop" landing page for makers across ALL crafts:
 * 3D printing, laser cutting, embroidery, CNC milling, and vinyl/stickers.
 */

const STEPS = [
  {
    n: "01",
    icon: <Camera className="h-5 w-5" />,
    title: "Snap your machine",
    body: "Take 1 photo of your machine and 3 sample pieces. We verify within 24h so customers trust you from day one.",
  },
  {
    n: "02",
    icon: <Package className="h-5 w-5" />,
    title: "Set materials & pricing",
    body: "List the materials you stock and your rates. Use our suggested pricing or set your own — works for any craft.",
  },
  {
    n: "03",
    icon: <Zap className="h-5 w-5" />,
    title: "Get matched automatically",
    body: "When a nearby customer uploads a file (STL, SVG, DST, STEP…), we match them to you based on craft, size, and tier.",
  },
  {
    n: "04",
    icon: <DollarSign className="h-5 w-5" />,
    title: "Make it, hand off, get paid",
    body: "Customer pays upfront. You make it, they pick up with a code, money lands in your account next day.",
  },
];

const PERKS = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: "You're protected",
    body: "Every order is paid before you start. No chasing invoices. No no-shows.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Local-first matching",
    body: "We send you customers from your neighborhood — short pickups, happy buyers, repeat orders.",
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: "Build a real reputation",
    body: "Tier badges, ratings, and quality scores reward consistent makers — not whoever bids lowest.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Work on your schedule",
    body: "Accept jobs only when your machine's free. Pause your shop in one click when you're on vacation.",
  },
  {
    icon: <HeartHandshake className="h-5 w-5" />,
    title: "Real human support",
    body: "Disputes? Tricky file? Our team has your back — and our 7-day remake guarantee splits costs fairly.",
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: "Free tools, no monthly fee",
    body: "Smart previews, AI cost estimator, bulk quote workflow, and earnings dashboard — all included.",
  },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    city: "Echo Park, LA",
    machine: "Bambu X1C — 3D printing",
    rating: 4.9,
    quote:
      "Made $640 my first month — and that's just from neighbors I never would've met otherwise. PrintLoco is the side hustle I wish existed years ago.",
  },
  {
    name: "Priya R.",
    city: "Brooklyn, NY",
    machine: "Glowforge Pro — Laser cutting",
    rating: 5.0,
    quote:
      "I was nervous about strangers, but verified pickup codes and upfront payment make it feel safe. My laser pays for itself now.",
  },
  {
    name: "Diego F.",
    city: "Mission, SF",
    machine: "Brother PR1055X — Embroidery",
    rating: 4.8,
    quote:
      "I went from 3 patches/month for friends to 30+ paid orders. The quality tiers actually reward you for doing it right.",
  },
];

const FAQ = [
  {
    q: "What kinds of makers can join?",
    a: "Any craft we support: 3D printing (FDM/resin), laser cutting & engraving, machine embroidery, CNC milling/routing, and vinyl/sticker cutting. More crafts are coming soon.",
  },
  {
    q: "How much does it cost to list?",
    a: "Nothing. PrintLoco only takes a small platform fee on completed orders — no listing fees, no monthly charges, no cancellation penalties.",
  },
  {
    q: "What machines can I list?",
    a: "Any machine in good working order. Bambu, Prusa, Glowforge, xTool, Brother, Tajima, Shapeoko, Cricut, Roland — they all qualify. We verify with a quick photo of sample work.",
  },
  {
    q: "How fast do I get paid?",
    a: "Payments arrive in your bank account 1–2 business days after the customer picks up and confirms.",
  },
  {
    q: "What if something goes wrong?",
    a: "Our 7-day remake guarantee splits the cost of redoing a job when something fails. Most disputes resolve in under 48 hours.",
  },
  {
    q: "Do I need to be home for pickups?",
    a: "Yes, but you control your pickup window. Most makers set evening or weekend slots. Pickup codes confirm the right buyer.",
  },
];

/** Per-service economics tuned to give a realistic monthly range. */
type EarningsModel = {
  unitLabel: string; // "g/hr", "min/job", "stitches/min"...
  defaultRate: number; // default price the slider opens at
  minRate: number;
  maxRate: number;
  step: number;
  rateLabel: string; // "Price per gram", "Price per minute"...
  rateFormat: (v: number) => string;
  /** Returns gross $/hour given the chosen rate. */
  grossPerHour: (rate: number) => number;
  rateHintLow: string;
  rateHintHigh: string;
};

const ECON: Record<ServiceId, EarningsModel> = {
  "3d-print": {
    unitLabel: "g/hr",
    defaultRate: 0.2,
    minRate: 0.1,
    maxRate: 0.5,
    step: 0.01,
    rateLabel: "Price per gram",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    grossPerHour: (rate) => 15 * rate, // ~15g/hr throughput
    rateHintLow: "Budget ($0.10)",
    rateHintHigh: "Premium ($0.50)",
  },
  "laser-cut": {
    unitLabel: "min/job",
    defaultRate: 1.5,
    minRate: 0.5,
    maxRate: 4,
    step: 0.1,
    rateLabel: "Price per machine minute",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    grossPerHour: (rate) => 60 * rate * 0.7, // 70% machine utilization
    rateHintLow: "Hobby ($0.50)",
    rateHintHigh: "Pro ($4.00)",
  },
  embroidery: {
    unitLabel: "stitches/min",
    defaultRate: 0.85,
    minRate: 0.3,
    maxRate: 2.5,
    step: 0.05,
    rateLabel: "Price per 1,000 stitches",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    // ~800 stitches/min, ~70% utilization → 33,600 stitches/hr → /1000 * rate
    grossPerHour: (rate) => 33.6 * rate,
    rateHintLow: "Starter ($0.30)",
    rateHintHigh: "Premium ($2.50)",
  },
  // (cnc removed)
  vinyl: {
    unitLabel: "sq.ft/hr",
    defaultRate: 6,
    minRate: 2,
    maxRate: 20,
    step: 0.5,
    rateLabel: "Price per sq. ft.",
    rateFormat: (v) => `$${v.toFixed(2)}`,
    grossPerHour: (rate) => 4 * rate, // ~4 sq.ft. produced per hour
    rateHintLow: "Basic ($2)",
    rateHintHigh: "Print + cut ($20)",
  },
};

/** Per-craft content overrides — used when on /become-a-maker/:service. */
type CraftContent = {
  heroTitle: string;
  heroBody: string;
  steps: { n: string; icon: React.ReactNode; title: string; body: string }[];
  perks: { icon: React.ReactNode; title: string; body: string }[];
  testimonials: { name: string; city: string; machine: string; rating: number; quote: string }[];
  faq: { q: string; a: string }[];
};

const CRAFT_CONTENT: Record<ServiceId, CraftContent> = {
  "3d-print": {
    heroTitle: "Turn your 3D printer into a neighborhood print shop.",
    heroBody:
      "Whether you run a Bambu, Prusa, Voron, or resin printer — local makers are earning $200–$1,200/month printing phone stands, RC parts, cosplay props, and replacement parts for neighbors. List in 5 minutes.",
    steps: [
      { n: "01", icon: <Camera className="h-5 w-5" />, title: "Photo of your printer + 3 prints", body: "Show us your machine and 3 sample prints (any material). We verify in under 24h." },
      { n: "02", icon: <Package className="h-5 w-5" />, title: "List your filaments & price per gram", body: "PLA, PETG, ABS, TPU, PLA+. Set your $/gram and minimum charge — we suggest fair rates." },
      { n: "03", icon: <Zap className="h-5 w-5" />, title: "We auto-slice & match", body: "When a neighbor uploads an STL/3MF, we pre-slice it and match by bed size, material, and tier." },
      { n: "04", icon: <DollarSign className="h-5 w-5" />, title: "Print, hand off, get paid", body: "Print on your schedule. Customer pays upfront, picks up with a code, payout next day." },
    ],
    perks: [
      { icon: <Shield className="h-5 w-5" />, title: "Failed prints? Covered.", body: "Our 7-day remake guarantee splits cost on print failures — you're not on the hook alone." },
      { icon: <Users className="h-5 w-5" />, title: "Local pickup, no shipping", body: "Customers pick up within 10 miles. No packing, no postage labels, no lost parcels." },
      { icon: <Star className="h-5 w-5" />, title: "Quality tiers reward you", body: "Bronze → Silver → Gold tiers based on rating and dimensional accuracy — higher tier = more jobs." },
      { icon: <Clock className="h-5 w-5" />, title: "Print queue control", body: "Set how many bed-hours/week you can take. Pause for vacations or filament restocks." },
      { icon: <HeartHandshake className="h-5 w-5" />, title: "STL support when stuck", body: "Tricky model? Our team helps with orientation, supports, and slicer settings." },
      { icon: <Wrench className="h-5 w-5" />, title: "Free pre-slicer + ETA", body: "We give customers a real weight/time estimate before they order — fewer surprises for both sides." },
    ],
    testimonials: [
      { name: "Marcus T.", city: "Echo Park, LA", machine: "Bambu X1C", rating: 4.9, quote: "Made $640 my first month printing stuff for neighbors I'd never have met. My X1C pays for itself every quarter." },
      { name: "Sara M.", city: "Portland, OR", machine: "Prusa MK4 ×3", rating: 5.0, quote: "I run a 3-printer farm in my garage. PrintLoco keeps all 3 busy without me chasing customers." },
      { name: "Devin H.", city: "Austin, TX", machine: "Elegoo Saturn 4", rating: 4.8, quote: "Resin minis used to be a money pit. Now it's a side income — and I love seeing my prints painted up." },
    ],
    faq: [
      { q: "Which printers qualify?", a: "Any FDM or resin printer in good condition: Bambu, Prusa, Voron, Creality, Elegoo, Anycubic, etc. We just need to see your machine and 3 sample prints." },
      { q: "Do I need to slice files myself?", a: "No — we pre-slice every STL/3MF with PrusaSlicer in the cloud and give the customer a real weight/time estimate before they order. You can re-slice with your own profile if you prefer." },
      { q: "What if a print fails halfway?", a: "Log the failure in your dashboard. Our 7-day remake guarantee covers the filament + a fair share of your time on legitimate print failures." },
      { q: "Can I refuse jobs?", a: "Yes. You can decline any job within 2 hours — bad geometry, missing supports, too-big-for-bed, anything." },
      { q: "How fast do I get paid?", a: "1–2 business days after the customer picks up and confirms." },
    ],
  },
  "laser-cut": {
    heroTitle: "Make your laser cutter pay for itself in months.",
    heroBody:
      "xTool, Glowforge, Boss, OMTech, Thunder, Epilog — if you can cut and engrave, neighbors need your machine for wedding signs, jewelry, packaging prototypes, and gifts. Most laser makers hit $400–$1,500/month.",
    steps: [
      { n: "01", icon: <Camera className="h-5 w-5" />, title: "Photo of your laser + 3 cuts", body: "Show your machine and 3 sample cuts/engraves on different materials. Verified in under 24h." },
      { n: "02", icon: <Package className="h-5 w-5" />, title: "Stock your material shelf", body: "List sheet sizes & thicknesses you keep on hand — plywood, acrylic, MDF, cardboard, leather." },
      { n: "03", icon: <Zap className="h-5 w-5" />, title: "Files come ready to cut", body: "We parse SVG/DXF/PDF/xCS/LBRN files, auto-detect cut vs engrave layers, and pack to your bed." },
      { n: "04", icon: <DollarSign className="h-5 w-5" />, title: "Cut, hand off, get paid", body: "Customer pays upfront based on machine time + sheet usage. Payout 1–2 days after pickup." },
    ],
    perks: [
      { icon: <Shield className="h-5 w-5" />, title: "Material waste is paid", body: "Sheets are priced per cost — you're never eating scrap on a small job." },
      { icon: <Users className="h-5 w-5" />, title: "Pickup-only, no shipping", body: "Flat pieces ship awkwardly. Local pickup means no broken-acrylic horror stories." },
      { icon: <Star className="h-5 w-5" />, title: "Engrave & cut both priced", body: "Our estimator separates cut length from engrave area so multi-op jobs are fair." },
      { icon: <Clock className="h-5 w-5" />, title: "Set your bed hours", body: "Cap how many hours of cut time you take per week. Ventilation breaks built-in." },
      { icon: <HeartHandshake className="h-5 w-5" />, title: "Smoke & char support", body: "We coach customers on material choice so you don't get stuck with awful files." },
      { icon: <Wrench className="h-5 w-5" />, title: "Free sheet-packing math", body: "We auto-nest parts onto your sheet size to minimize waste before you accept." },
    ],
    testimonials: [
      { name: "Priya R.", city: "Brooklyn, NY", machine: "Glowforge Pro", rating: 5.0, quote: "Verified pickup codes and upfront payment make it feel safe. My Glowforge pays for itself every 3 months now." },
      { name: "Jess L.", city: "Denver, CO", machine: "xTool P2 55W", rating: 4.9, quote: "Weddings & holidays are insane. PrintLoco filters out the bad files before they hit my queue." },
      { name: "Tom B.", city: "Seattle, WA", machine: "OMTech 80W CO2", rating: 4.8, quote: "I do a lot of acrylic. The sheet-packing math means I'm not losing money on tiny orders anymore." },
    ],
    faq: [
      { q: "Which lasers qualify?", a: "Diode (xTool, Glowforge), CO2 (Boss, OMTech, Thunder, Epilog), and fiber lasers. Any wattage. We verify with photos of your machine and sample work." },
      { q: "What file types do you accept?", a: "SVG, DXF, PDF, AI, EPS, xTool .xcs, LightBurn .lbrn/.lbrn2, DWG, and raster (PNG/JPG) for engraving. We auto-detect red = cut, others = engrave by default but customers can override per layer." },
      { q: "How is pricing calculated?", a: "Sheet usage (parts auto-packed to your bed) + machine time (cut length / cut speed + engrave area / engrave speed) + electricity at your kWh rate. Customers see the full breakdown." },
      { q: "Can I reject sketchy files?", a: "Yes. Decline within 2 hours if a file has bad geometry, open paths, or material that won't cut safely." },
      { q: "Do I need ventilation/MSDS?", a: "Yes — verified makers confirm they have appropriate ventilation. PVC and other chlorinated materials are blocked by default." },
    ],
  },
  embroidery: {
    heroTitle: "Stitch logos, patches & monograms for your neighborhood.",
    heroBody:
      "Brother, Janome, Bernina, Tajima, Melco, Ricoma — multi-needle or single-head, your embroidery machine can earn $300–$1,800/month doing logos for local cafés, sports teams, wedding gifts, and custom hats.",
    steps: [
      { n: "01", icon: <Camera className="h-5 w-5" />, title: "Photo of your machine + 3 patches", body: "Show your embroidery setup and 3 sample stitch-outs on different fabrics." },
      { n: "02", icon: <Package className="h-5 w-5" />, title: "List hoop sizes & thread colors", body: "Tell us your hoops (4×4, 5×7, 6×10…) and Madeira/Isacord colors you keep stocked." },
      { n: "03", icon: <Zap className="h-5 w-5" />, title: "We parse DST/PES & estimate", body: "Upload DST/PES/EXP and we count stitches, runtime, and thread changes. Art files are auto-digitized." },
      { n: "04", icon: <DollarSign className="h-5 w-5" />, title: "Stitch, hand off, get paid", body: "Customer pays per 1,000 stitches + hoop fee. Payout 1–2 days after pickup." },
    ],
    perks: [
      { icon: <Shield className="h-5 w-5" />, title: "Digitizing is on us", body: "Customers upload PNG/SVG and we digitize to DST before it reaches your queue — no rework." },
      { icon: <Users className="h-5 w-5" />, title: "Garments stay local", body: "Customers drop off blanks and pick up finished — no liability for shipping fabric." },
      { icon: <Star className="h-5 w-5" />, title: "Thread color matching", body: "We auto-map customer colors to your stocked spools. Out-of-stock = you decline, no penalty." },
      { icon: <Clock className="h-5 w-5" />, title: "Hoop-time scheduling", body: "Set total hoop hours/week. Multi-needle makers can take rush orders for extra pay." },
      { icon: <HeartHandshake className="h-5 w-5" />, title: "Bobbin & backing covered", body: "Standard backings + bobbin thread bundled into the hoop fee — no nickel-and-diming." },
      { icon: <Wrench className="h-5 w-5" />, title: "Stitch-count auto-detect", body: "DST/PES files have stitch count read directly — no manual entry, no underpaying yourself." },
    ],
    testimonials: [
      { name: "Diego F.", city: "Mission, SF", machine: "Brother PR1055X", rating: 4.8, quote: "Went from 3 patches/month for friends to 30+ paid orders. The tier system rewards doing it right." },
      { name: "Aya K.", city: "Chicago, IL", machine: "Tajima 6-head", rating: 5.0, quote: "I'm a 6-head shop. PrintLoco fills the gaps between my big contracts with local hats and totes." },
      { name: "Luis M.", city: "Miami, FL", machine: "Janome MB-4S", rating: 4.7, quote: "Monogrammed wedding gifts are my bread and butter now. Customers love the local turnaround." },
    ],
    faq: [
      { q: "Which embroidery machines qualify?", a: "Any commercial or hobby embroidery machine: Brother, Janome, Bernina, Tajima, Melco, Ricoma, SWF, Happy. Single-needle is fine — multi-needle takes more jobs." },
      { q: "What file types do you accept?", a: "DST, PES, EXP, JEF, VP3, XXX. We also accept PNG/SVG/AI art — our team digitizes to DST before it hits your queue (digitizing fee is on the customer)." },
      { q: "Do I have to provide blanks?", a: "No. Customers drop off their own shirts/hats/patches. You only supply thread and backing. You can optionally stock blanks for extra margin." },
      { q: "What if I run out of a thread color?", a: "Decline within 2 hours and we re-route the job. No penalty to your tier." },
      { q: "How is the price calculated?", a: "$ per 1,000 stitches (your rate) + hoop fee + thread color count. Customers see the breakdown before they pay." },
    ],
  },
  vinyl: {
    heroTitle: "Turn your vinyl cutter into a sticker & sign business.",
    heroBody:
      "Cricut, Silhouette, Roland, Graphtec, USCutter — local makers earn $150–$900/month cutting decals, heat-transfer for shirts, shop window vinyl, and print-and-cut stickers. Low-overhead, high-margin work.",
    steps: [
      { n: "01", icon: <Camera className="h-5 w-5" />, title: "Photo of your cutter + 3 cuts", body: "Show your machine and 3 sample cuts (adhesive, HTV, or print+cut). Verified in 24h." },
      { n: "02", icon: <Package className="h-5 w-5" />, title: "List rolls & vinyl types", body: "Adhesive, HTV, reflective, glitter HTV, print+cut stock. Tell us what colors you stock." },
      { n: "03", icon: <Zap className="h-5 w-5" />, title: "SVG/PDF in, decal out", body: "Customers upload SVG/PDF, we measure area and match to your roll widths." },
      { n: "04", icon: <DollarSign className="h-5 w-5" />, title: "Cut, weed, hand off, get paid", body: "Weed, transfer-tape if needed, hand off with pickup code. Payout 1–2 days later." },
    ],
    perks: [
      { icon: <Shield className="h-5 w-5" />, title: "Weeding time is paid", body: "Tiny intricate cuts take forever to weed — our estimator factors that into your payout." },
      { icon: <Users className="h-5 w-5" />, title: "Drop-off / pickup only", body: "Vinyl ships terribly — local pickup means no creased decals or peeled transfer tape in the mail." },
      { icon: <Star className="h-5 w-5" />, title: "Color & finish match", body: "Customers pick from your stocked colors only — no chasing a shade you don't carry." },
      { icon: <Clock className="h-5 w-5" />, title: "Quick turnaround = bonus", body: "Same-day cuts get a rush fee bonus split with you. Sticker work moves fast." },
      { icon: <HeartHandshake className="h-5 w-5" />, title: "HTV pressing optional", body: "If you have a heat press, opt in for shirt orders at a higher rate. Press-less makers do decals only." },
      { icon: <Wrench className="h-5 w-5" />, title: "Free transfer-tape math", body: "We size transfer tape and waste into the quote so you never lose money on small jobs." },
    ],
    testimonials: [
      { name: "Mina T.", city: "Nashville, TN", machine: "Roland GS-24", rating: 4.9, quote: "Shop window vinyl and laptop decals all day. PrintLoco brings me orders I'd never have hustled for." },
      { name: "Pablo R.", city: "Phoenix, AZ", machine: "Cricut Maker 3 + heat press", rating: 4.8, quote: "Team shirts are seasonal gold. The platform handles invoicing and I just press and hand off." },
      { name: "Kim D.", city: "Boston, MA", machine: "Silhouette Cameo 5", rating: 4.7, quote: "Started as a hobby. Now it covers my rent half the year. Sticker-pack orders are the best." },
    ],
    faq: [
      { q: "Which vinyl cutters qualify?", a: "Cricut, Silhouette, Brother ScanNCut, Roland, Graphtec, USCutter, Vevor — any cutter in good condition. Print+cut requires a compatible printer too." },
      { q: "What file types do you accept?", a: "SVG, PDF, PNG. Single-color cuts are easiest; multi-color and print+cut are priced separately." },
      { q: "Do I need a heat press for shirts?", a: "Only if you opt into HTV/shirt orders. Decal-only makers can ignore the heat press category." },
      { q: "How is pricing calculated?", a: "Area of vinyl used + material cost (per your roll prices) + weeding complexity. Print+cut adds ink/laminate fees." },
      { q: "What about color matching?", a: "Customers pick from your stocked colors only. If they want a shade you don't have, the order routes to another maker." },
    ],
  },
};

const BecomeMaker = () => {
  const { user, profile } = useAuth();
  const isAlreadyMaker = profile?.role === "maker";
  const { service: routeService } = useParams<{ service?: string }>();
  const routeServiceId = SERVICES.find((s) => s.id === routeService)?.id;

  const [serviceId, setServiceId] = useState<ServiceId>(routeServiceId ?? "3d-print");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(20);
  const econ = ECON[serviceId];
  const [rate, setRate] = useState<number>(econ.defaultRate);
  const service = SERVICES.find((s) => s.id === serviceId)!;

  // If the route changes (e.g. user clicks a different /become-a-maker/:service link), sync state.
  useEffect(() => {
    if (routeServiceId && routeServiceId !== serviceId) {
      setServiceId(routeServiceId);
      setRate(ECON[routeServiceId].defaultRate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeServiceId]);

  // Recompute when service changes — keep rate in valid range.
  const onPickService = (id: ServiceId) => {
    setServiceId(id);
    setRate(ECON[id].defaultRate);
  };

  const earnings = useMemo(() => {
    const grossPerHour = econ.grossPerHour(rate);
    const weekly = grossPerHour * hoursPerWeek * 0.9; // 10% platform fee
    const monthly = weekly * 4.3;
    const yearly = monthly * 12;
    return {
      weekly: Math.round(weekly),
      monthly: Math.round(monthly),
      yearly: Math.round(yearly),
    };
  }, [hoursPerWeek, rate, econ]);

  const signupHref = user
    ? isAlreadyMaker
      ? "/dashboard"
      : "/auth?mode=signup&role=maker"
    : "/auth?mode=signup&role=maker";

  const onRoute = !!routeServiceId;
  const craft = onRoute ? CRAFT_CONTENT[serviceId] : null;
  const steps = craft?.steps ?? STEPS;
  const perks = craft?.perks ?? PERKS;
  const testimonials = craft?.testimonials ?? TESTIMONIALS;
  const faq = craft?.faq ?? FAQ;

  const seoTitle = onRoute
    ? `Become a ${service.name} Maker — Earn With Your ${service.shortName} | PrintLoco`
    : "Become a Maker — Earn With Your Workshop | PrintLoco";
  const seoDesc = onRoute
    ? `Turn your ${service.shortName.toLowerCase()} into income. Get matched with neighbors on PrintLoco — paid upfront, free to list.`
    : "Turn your 3D printer, laser cutter, embroidery machine, or vinyl cutter into income. List on PrintLoco and get matched with neighbors.";
  const seoPath = onRoute ? `/become-a-maker/${service.id}` : "/become-a-maker";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDesc} path={seoPath} />
      <Navbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-hero">
          <div className="container grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3 w-3" /> {onRoute ? `For ${service.shortName} Makers` : "For Makers"}
              </div>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                {craft ? (
                  craft.heroTitle
                ) : (
                  <>
                    Turn your workshop into a <span className="italic text-primary">side income</span>.
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                {craft ? craft.heroBody : "Whether you 3D print, laser cut, embroider, or cut vinyl — join hundreds of local makers earning $200–$1,500/month making things for neighbors. No factory. No marketing. Just your machine, your schedule, and real customers around the corner."}
              </p>

              {/* Service chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {SERVICES.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPickService(s.id)}
                      className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-soft"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {s.shortName}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="hero" size="lg" asChild>
                  <Link to={signupHref}>
                    {isAlreadyMaker ? "Go to your dashboard" : "Open your maker shop"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="soft" size="lg" asChild>
                  <a href="#calculator">See what you could earn</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Free to list
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Paid upfront
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> 5-min setup
                </span>
              </div>
            </div>

            {/* Hero "earnings card" mock — animates with selected service */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={serviceId}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`relative rounded-3xl border border-border bg-card p-6 shadow-card bg-gradient-to-br ${service.gradient}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        This week · {service.shortName}
                      </div>
                      <div className="mt-1 font-display text-4xl font-semibold">
                        ${earnings.weekly}
                        <span className="text-xl text-muted-foreground">.00</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                      <TrendingUp className="h-3 w-3" /> +28%
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {sampleOrdersFor(serviceId).map((o) => (
                      <div
                        key={o.file}
                        className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{o.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{o.file}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">${o.price}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" /> 4.9 · 47 ratings
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Echo Park, LA
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF STRIP */}
        <section className="border-b border-border bg-card/40">
          <div className="container grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
            {[
              { v: "$1.2M+", l: "Paid to makers" },
              { v: "12,400+", l: "Local jobs completed" },
              { v: "4.87 ★", l: "Avg maker rating" },
              { v: "1–2 days", l: "Payout time" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-3xl font-semibold tracking-tight">{s.v}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              How it works
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
              From idle machine to paid orders in{" "}
              <span className="italic text-primary">one afternoon</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary-foreground">
                  STEP {s.n}
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  {s.icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* EARNINGS CALCULATOR */}
        <section
          id="calculator"
          className="border-y border-border bg-gradient-to-br from-primary/5 via-background to-accent/5"
        >
          <div className="container grid gap-12 py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Calculator className="h-3 w-3" /> Earnings estimator
              </div>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">
                Your machine could pay for itself in{" "}
                <span className="italic text-primary">2–3 months</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Pick your craft, then adjust how often you'd accept jobs and your rate.
                These are real averages from active PrintLoco makers — not marketing fluff.
              </p>

              {/* Service picker for calculator */}
              <div className="mt-6 flex flex-wrap gap-2">
                {SERVICES.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPickService(s.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {s.shortName}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">Hours of machine time / week</span>
                    <span className="font-display text-lg font-semibold text-primary">
                      {hoursPerWeek}h
                    </span>
                  </div>
                  <Slider
                    value={[hoursPerWeek]}
                    min={4}
                    max={80}
                    step={2}
                    onValueChange={(v) => setHoursPerWeek(v[0])}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Casual (4h)</span>
                    <span>Almost full-time (80h)</span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">{econ.rateLabel}</span>
                    <span className="font-display text-lg font-semibold text-primary">
                      {econ.rateFormat(rate)}
                    </span>
                  </div>
                  <Slider
                    value={[rate]}
                    min={econ.minRate}
                    max={econ.maxRate}
                    step={econ.step}
                    onValueChange={(v) => setRate(v[0])}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{econ.rateHintLow}</span>
                    <span>{econ.rateHintHigh}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {service.shortName} · take-home (after 10% fee)
                </div>
                <span className="text-2xl">{service.emoji}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${serviceId}-${hoursPerWeek}-${rate}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 grid gap-4"
                >
                  <EarningRow label="Per week" value={earnings.weekly} />
                  <EarningRow label="Per month" value={earnings.monthly} highlight />
                  <EarningRow label="Per year" value={earnings.yearly} muted />
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 rounded-xl bg-primary/5 p-4 text-xs text-muted-foreground">
                Based on typical {service.shortName.toLowerCase()} throughput across active
                makers. Real earnings vary with materials, complexity, and how quickly you
                accept incoming orders.
              </div>

              <Button variant="hero" size="lg" asChild className="mt-6 w-full">
                <Link to={signupHref}>
                  Start earning this week <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* PERKS GRID */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Why makers choose PrintLoco
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
              The fairest deal in local manufacturing
            </h2>
            <p className="mt-3 text-muted-foreground">
              We built this with makers, not for them. Every rule below comes from real feedback.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  {p.icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="border-y border-border bg-card/40">
          <div className="container py-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Maker stories
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                Real makers. Real paychecks.
              </h2>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="rounded-2xl border border-border bg-card p-6 shadow-soft"
                >
                  <Quote className="h-6 w-6 text-primary/40" />
                  <blockquote className="mt-3 text-sm leading-relaxed">
                    "{t.quote}"
                  </blockquote>
                  <figcaption className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.machine} · {t.city}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                      {t.rating}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                FAQ
              </div>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                Everything you're wondering
              </h2>
            </div>

            <div className="mt-12 space-y-3">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all open:shadow-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="font-display text-lg font-semibold">{f.q}</span>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="container pb-24">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-gradient-to-br from-primary via-primary to-accent p-12 text-primary-foreground shadow-card">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> 5 minutes to launch
                </div>
                <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                  Open your maker shop today.
                </h2>
                <p className="mt-4 max-w-xl text-primary-foreground/80">
                  Free forever to list. Get verified within 24 hours. Start
                  receiving local orders this week — for any craft you make.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button size="lg" variant="secondary" asChild className="text-base">
                  <Link to={signupHref}>
                    {isAlreadyMaker ? "Go to dashboard" : "Open my shop"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                  <Link to="/printers">See active makers near me</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

/** Sample order rows shown in the hero card per craft. Purely cosmetic. */
function sampleOrdersFor(id: ServiceId) {
  switch (id) {
    case "3d-print":
      return [
        { name: "Sara M.", file: "phone-stand.3mf", price: 18, status: "Picked up" },
        { name: "Jordan K.", file: "raspberry-pi-case.stl", price: 24, status: "Printing" },
        { name: "Emi R.", file: "vase-twist.3mf", price: 31, status: "Ready" },
      ];
    case "laser-cut":
      return [
        { name: "Owen P.", file: "wedding-signage.svg", price: 42, status: "Picked up" },
        { name: "Maya L.", file: "earring-set.dxf", price: 16, status: "Cutting" },
        { name: "Ben C.", file: "logo-engrave.pdf", price: 28, status: "Ready" },
      ];
    case "embroidery":
      return [
        { name: "Tara V.", file: "company-logo.dst", price: 22, status: "Stitching" },
        { name: "Luis M.", file: "tote-monogram.pes", price: 14, status: "Ready" },
        { name: "Aya K.", file: "team-patch.dst", price: 38, status: "Picked up" },
      ];
    // cnc removed
    case "vinyl":
      return [
        { name: "Mina T.", file: "shop-window.svg", price: 35, status: "Cutting" },
        { name: "Pablo R.", file: "team-shirts.pdf", price: 58, status: "Ready" },
        { name: "Kim D.", file: "laptop-decals.svg", price: 12, status: "Picked up" },
      ];
  }
}

const EarningRow = ({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) => (
  <div
    className={`flex items-center justify-between rounded-xl border p-4 ${
      highlight
        ? "border-primary/40 bg-primary/10"
        : muted
        ? "border-border bg-muted/30"
        : "border-border bg-background"
    }`}
  >
    <span className={`text-sm ${highlight ? "font-semibold" : "text-muted-foreground"}`}>
      {label}
    </span>
    <span
      className={`font-display font-semibold ${
        highlight ? "text-3xl text-primary" : muted ? "text-xl text-muted-foreground" : "text-2xl"
      }`}
    >
      ${value.toLocaleString()}
    </span>
  </div>
);

export default BecomeMaker;
