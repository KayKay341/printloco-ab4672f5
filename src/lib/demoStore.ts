/**
 * localStorage-backed store for demo mode. Lets non-admin visitors run the
 * full PrintLoco flow (orders, listings, uploads, ratings, disputes) without
 * touching Supabase or Stripe.
 *
 * - Status auto-progresses on a timer so visitors see motion.
 * - Pub/sub so React components react to changes (and across tabs).
 */

const KEY = "printloco:demo:v1";

export type DemoOrderStatus =
  | "paid"
  | "accepted"
  | "printing"
  | "ready"
  | "completed"
  | "disputed"
  | "cancelled";

export type DemoOrder = {
  id: string;
  createdAt: string;
  printerId: string;
  printerLabel: string;
  makerName: string;
  fileName: string | null;
  fileKind: "stl" | "3mf" | "url" | null;
  fileUrl?: string | null; // for "Open in Bambu Studio" demo
  material: string;
  colorName?: string | null;
  quantity: number;
  weightG: number;
  amountCents: number;
  status: DemoOrderStatus;
  timeline: { at: string; label: string }[];
  rating?: { stars: number; comment?: string } | null;
  dispute?: { reason: string; description: string; at: string } | null;
};

export type DemoPrinter = {
  id: string;
  createdAt: string;
  brand: string;
  model: string;
  neighborhood: string | null;
  city: string | null;
  bio: string | null;
  materials: string[];
  pricePerGram: number;
  hasAms: boolean;
  amsSlotCount: number;
  accepts3mf: boolean;
  acceptsBulk: boolean;
  minBulkQty: number;
  qualityScore: number;
  tier: "hobbyist" | "maker" | "professional";
};

export type DemoUpload = {
  id: string;
  createdAt: string;
  fileName: string;
  fileKind: "stl" | "3mf" | "url";
  weightG: number;
  estimatedPriceCents: number;
  material: string;
  sourceUrl?: string;
};

export type DemoState = {
  orders: DemoOrder[];
  printers: DemoPrinter[];
  uploads: DemoUpload[];
  bannerDismissed: boolean;
};

const empty = (): DemoState => ({
  orders: [],
  printers: [],
  uploads: [],
  bannerDismissed: false,
});

const read = (): DemoState => {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      orders: parsed.orders ?? [],
      printers: parsed.printers ?? [],
      uploads: parsed.uploads ?? [],
      bannerDismissed: parsed.bannerDismissed ?? false,
    };
  } catch {
    return empty();
  }
};

const write = (s: DemoState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // quota exceeded — best effort
  }
  emit();
};

// --- pub/sub ---
type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit();
  });
}

export const demoStore = {
  get: read,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KEY);
    }
    emit();
  },
  setBannerDismissed(v: boolean) {
    const s = read();
    s.bannerDismissed = v;
    write(s);
  },

  // --- orders ---
  addOrder(input: Omit<DemoOrder, "id" | "createdAt" | "status" | "timeline">): DemoOrder {
    const order: DemoOrder = {
      id: `demo-ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: "paid",
      timeline: [{ at: new Date().toISOString(), label: "Payment confirmed" }],
      ...input,
    };
    const s = read();
    s.orders = [order, ...s.orders];
    write(s);
    scheduleProgression(order.id);
    return order;
  },
  updateOrder(id: string, patch: Partial<DemoOrder>) {
    const s = read();
    s.orders = s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o));
    write(s);
  },
  rateOrder(id: string, stars: number, comment?: string) {
    const s = read();
    s.orders = s.orders.map((o) =>
      o.id === id
        ? {
            ...o,
            rating: { stars, comment },
            timeline: [...o.timeline, { at: new Date().toISOString(), label: `Customer rated ${stars}★` }],
          }
        : o
    );
    write(s);
  },
  disputeOrder(id: string, reason: string, description: string) {
    const s = read();
    s.orders = s.orders.map((o) =>
      o.id === id
        ? {
            ...o,
            status: "disputed" as DemoOrderStatus,
            dispute: { reason, description, at: new Date().toISOString() },
            timeline: [...o.timeline, { at: new Date().toISOString(), label: `Dispute filed: ${reason}` }],
          }
        : o
    );
    write(s);
  },

  // --- printers ---
  addPrinter(input: Omit<DemoPrinter, "id" | "createdAt">): DemoPrinter {
    const printer: DemoPrinter = {
      id: `demo-printer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...input,
    };
    const s = read();
    s.printers = [printer, ...s.printers];
    write(s);
    return printer;
  },

  // --- uploads ---
  addUpload(input: Omit<DemoUpload, "id" | "createdAt">): DemoUpload {
    const upload: DemoUpload = {
      id: `demo-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...input,
    };
    const s = read();
    s.uploads = [upload, ...s.uploads];
    write(s);
    return upload;
  },
};

// --- auto status progression ---
const PROGRESSION: { from: DemoOrderStatus; to: DemoOrderStatus; ms: number; label: string }[] = [
  { from: "paid", to: "accepted", ms: 6000, label: "Maker accepted the job" },
  { from: "accepted", to: "printing", ms: 8000, label: "Printer started extruding" },
  { from: "printing", to: "ready", ms: 14000, label: "Print finished — ready for pickup" },
];

const scheduledTimers = new Map<string, number>();

function scheduleProgression(orderId: string) {
  if (typeof window === "undefined") return;
  const tick = () => {
    const s = read();
    const order = s.orders.find((o) => o.id === orderId);
    if (!order) return;
    if (order.status === "completed" || order.status === "cancelled" || order.status === "disputed") return;

    const step = PROGRESSION.find((p) => p.from === order.status);
    if (!step) return;

    const updated: DemoOrder = {
      ...order,
      status: step.to,
      timeline: [...order.timeline, { at: new Date().toISOString(), label: step.label }],
    };
    s.orders = s.orders.map((o) => (o.id === orderId ? updated : o));
    write(s);

    const next = PROGRESSION.find((p) => p.from === step.to);
    if (next) {
      const t = window.setTimeout(tick, next.ms + Math.random() * 2000);
      scheduledTimers.set(orderId, t);
    }
  };
  const first = PROGRESSION[0];
  const t = window.setTimeout(tick, first.ms + Math.random() * 2000);
  scheduledTimers.set(orderId, t);
}

/**
 * Resume any in-flight demo orders after a page reload.
 */
export function resumeDemoProgressions() {
  const s = read();
  s.orders.forEach((o) => {
    if (o.status === "paid" || o.status === "accepted" || o.status === "printing") {
      if (!scheduledTimers.has(o.id)) scheduleProgression(o.id);
    }
  });
}

if (typeof window !== "undefined") {
  // resume on import
  setTimeout(resumeDemoProgressions, 200);
}
