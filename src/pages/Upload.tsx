import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Upload as UploadIcon,
  FileBox,
  MapPin,
  Sparkles,
  Loader2,
  CreditCard,
  Layers,
  Package,
  Palette,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import {
  MATERIAL_BASE_PRICE,
  sliceStlBufferAccurate,
  type SliceResult,
} from "@/lib/stlSlicer";
import { parse3mf, recolorBySlot, type FilamentSlot, type Mfg3mfResult } from "@/lib/threeMfParser";
import StlPreview, { type PreviewPart } from "@/components/StlPreview";
import ColorPicker from "@/components/ColorPicker";
import PrinterMap from "@/components/PrinterMap";
import CheckoutDialog from "@/components/CheckoutDialog";
import BulkQuoteDialog from "@/components/BulkQuoteDialog";
import CostEstimator, { DEFAULT_COST_INPUTS, type CostInputs, type EstimatorOutput } from "@/components/CostEstimator";
import { scorePrinter, type PrinterForScore, type ScoredPrinter } from "@/lib/printerScore";
import { BUILD_PLATES, DEFAULT_PLATE_ID, getPlate, checkFit, parseBuildVolume } from "@/lib/buildPlates";
import {
  cryptoId,
  findCollisions,
  IDENTITY_TRANSFORM,
  makePlate,
  plateOverflow,
  previewGeometry,
  transformedBbox,
  type PartState,
  type PartTransform,
  type PlateState,
} from "@/lib/sliceJob";
import { bakeStl, geometryToBinaryStl, mergeBinaryStls } from "@/lib/stlTransform";
import PartTransformPanel from "@/components/PartTransformPanel";
import PlateTabs from "@/components/PlateTabs";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Nylon", "Resin"];

type SourceMode = "file" | "url";

type FilamentColorRow = {
  material: string;
  color_name: string;
  hex_code: string;
  in_stock: boolean;
  surcharge_per_gram?: number;
};

type PrinterRow = PrinterForScore & {
  brand: string;
  model: string;
  neighborhood: string | null;
  city: string | null;
  bio: string | null;
  owner_id: string;
  has_ams: boolean;
  ams_slot_count: number;
  accepts_3mf: boolean;
  accepts_bulk: boolean;
  min_bulk_quantity: number;
  build_volume: string | null;
  material_prices: Record<string, number> | null;
  profiles: { full_name: string | null } | null;
  filament_colors: FilamentColorRow[];
};

const Upload = () => {
  const { user, loading } = useAuth();
  const { isDemo } = useDemoMode();
  const navigate = useNavigate();

  // Source / file UI
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  // 3MF (single-plate, single-part path)
  const [mfg, setMfg] = useState<Mfg3mfResult | null>(null);
  const [mfgFile, setMfgFile] = useState<File | null>(null);
  const [originalSlots, setOriginalSlots] = useState<FilamentSlot[]>([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [sliceProgress, setSliceProgress] = useState(0);
  const [sliceStage, setSliceStage] = useState<string>("");

  // Material / color (STL path)
  const [material, setMaterial] = useState("PLA");
  const [colorName, setColorName] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState<string>("#9333EA");

  // Printers
  const [printers, setPrinters] = useState<PrinterRow[]>([]);

  // Plates / parts (STL path)
  const [plates, setPlates] = useState<PlateState[]>(() => [makePlate(DEFAULT_PLATE_ID)]);
  const [activePlateId, setActivePlateId] = useState<string>(plates[0].id);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [slicing, setSlicing] = useState(false);

  // Cost inputs (settings panel — DOES NOT auto-slice)
  const [costInputs, setCostInputs] = useState<CostInputs>({ ...DEFAULT_COST_INPUTS, material: "PLA" });
  const [estimate, setEstimate] = useState<EstimatorOutput | null>(null);

  // Submit / checkout
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null);
  const [savedStlId, setSavedStlId] = useState<string | null>(null);

  // Bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrinter, setBulkPrinter] = useState<PrinterRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCostInputs((c) => ({ ...c, material })); }, [material]);

  // Fetch printers once
  useEffect(() => {
    supabase
      .from("printers")
      .select("id, owner_id, brand, model, materials, price_per_gram, material_prices, neighborhood, city, bio, latitude, longitude, has_ams, ams_slot_count, accepts_3mf, accepts_bulk, min_bulk_quantity, build_volume, profiles!printers_owner_profile_fkey(full_name), filament_colors(material, color_name, hex_code, in_stock, surcharge_per_gram)")
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setPrinters((data as unknown as PrinterRow[]) ?? []);
      });
  }, []);

  // ----- Active plate helpers -----
  const activePlate: PlateState = useMemo(
    () => plates.find((p) => p.id === activePlateId) ?? plates[0],
    [plates, activePlateId],
  );
  const plateModel = useMemo(() => getPlate(activePlate.plateId), [activePlate.plateId]);

  const updateActivePlate = (updater: (p: PlateState) => PlateState, markDirty = true) => {
    setPlates((prev) => prev.map((p) => p.id === activePlateId ? updater({ ...p, dirty: markDirty ? true : p.dirty }) : p));
  };

  const updatePart = (partId: string, patch: Partial<PartTransform>) => {
    updateActivePlate((p) => ({
      ...p,
      parts: p.parts.map((part) => part.id === partId ? { ...part, transform: { ...part.transform, ...patch } } : part),
    }));
  };

  const selectedPart = useMemo(
    () => activePlate.parts.find((p) => p.id === selectedPartId) ?? null,
    [activePlate.parts, selectedPartId],
  );

  // ----- File input → load as STL part(s) or 3MF -----
  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "stl" && ext !== "3mf") {
      toast.error("Please upload a .stl or .3mf file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large (50MB max)");
      return;
    }
    setSavedStlId(null);

    // Immediate "received / uploading" feedback so the user always sees something.
    setUploading(true);
    setUploadFileName(file.name);
    toast.info(`Received ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB) — preparing…`);

    if (ext === "3mf") {
      setParsing(true);
      let parsed: Mfg3mfResult | null = null;
      try {
        const buf = await file.arrayBuffer();
        parsed = await parse3mf(buf);

        // Show the model in the preview IMMEDIATELY — don't wait for the slicer.
        setMfg(parsed);
        setMfgFile(file);
        setOriginalSlots(parsed.filaments.map((f) => ({ ...f })));
        setMaterial(parsed.sliceSettings.material);
        setCostInputs((prev) => ({
          ...prev,
          material: parsed!.sliceSettings.material,
          infillPct: parsed!.sliceSettings.infillPct,
          layerHeightMm: parsed!.sliceSettings.layerHeightMm,
          walls: parsed!.sliceSettings.walls,
          supports: parsed!.sliceSettings.supports,
        }));

        if (parsed.totalWeightG > 0) {
          toast.success(`3MF loaded · ${parsed.totalWeightG.toFixed(1)}g (from embedded G-code)`);
        } else {
          toast.info("3MF loaded — re-slicing in background to compute weight…");
        }
      } catch (err: any) {
        toast.error(`Could not parse 3MF: ${err.message}`);
        setParsing(false);
        setUploading(false);
        return;
      } finally {
        setParsing(false);
        setUploading(false);
      }

      // Background re-slice (only if no weight was read from embedded G-code).
      if (parsed && parsed.totalWeightG <= 0) {
        const captured = parsed;
        setSlicing(true);
        setSliceProgress(2);
        setSliceStage("Preparing geometry…");

        // Animated progress: ramp to ~90% over ~30s so users see motion.
        const startedAt = Date.now();
        const progressTimer = window.setInterval(() => {
          const elapsed = (Date.now() - startedAt) / 1000;
          // asymptotic curve toward 90
          const pct = Math.min(90, 5 + 85 * (1 - Math.exp(-elapsed / 12)));
          setSliceProgress(pct);
          if (elapsed > 2 && elapsed < 8) setSliceStage("Slicing layers…");
          else if (elapsed >= 8 && elapsed < 20) setSliceStage("Computing extrusion…");
          else if (elapsed >= 20) setSliceStage("Finalizing weight…");
        }, 400);

        // Watchdog: if slicing takes longer than 90s, bail out so it doesn't spin forever.
        const watchdog = window.setTimeout(() => {
          window.clearInterval(progressTimer);
          setSlicing(false);
          setSliceProgress(0);
          setSliceStage("");
          toast.error("Slicer timed out after 90s. Try a smaller model or set weight manually.");
        }, 90_000);

        (async () => {
          try {
            const sliceBuf = geometryToBinaryStl(captured.geometry);
            const sliceResult = await sliceStlBufferAccurate(sliceBuf, {
              material: captured.sliceSettings.material,
              infillPct: captured.sliceSettings.infillPct,
              layerHeightMm: captured.sliceSettings.layerHeightMm,
              walls: captured.sliceSettings.walls,
              supports: captured.sliceSettings.supports,
              filamentDiameterMm: captured.sliceSettings.filamentDiameterMm,
              materialDensityGPerCm3: captured.sliceSettings.materialDensityGPerCm3,
              sourceUnits: "mm",
              scale: 1,
              plate: plateModel,
            });
            window.clearTimeout(watchdog);
            window.clearInterval(progressTimer);
            setSliceProgress(100);
            setSliceStage("Done");
            if (sliceResult.weightG > 0) {
              setMfg((cur) => cur === captured ? {
                ...cur,
                totalWeightG: sliceResult.weightG,
                printMinutes: sliceResult.printMinutes || cur.printMinutes,
              } : cur);
              toast.success(`Slice complete · ${sliceResult.weightG.toFixed(1)}g`);
            } else {
              toast.error("Slicer could not compute weight for this 3MF.");
            }
          } catch (err: any) {
            window.clearTimeout(watchdog);
            window.clearInterval(progressTimer);
            toast.error(`Slice failed: ${err.message ?? "unknown error"}`);
          } finally {
            setSlicing(false);
            // brief delay so 100% is visible
            window.setTimeout(() => { setSliceProgress(0); setSliceStage(""); }, 600);
          }
        })();
      }
      return;
    }

    // STL → add as a part to the active plate
    setMfg(null);
    setMfgFile(null);
    try {
      setParsing(true);
      const buf = await file.arrayBuffer();
      const loader = new STLLoader();
      const geom = loader.parse(buf);
      geom.computeBoundingBox();
      const sz = new THREE.Vector3();
      geom.boundingBox!.getSize(sz);

      // Heuristic inch detection: very small "mm" bbox
      const sourceUnits: "mm" | "in" = (Math.max(sz.x, sz.y, sz.z) > 0 && Math.max(sz.x, sz.y, sz.z) < 8) ? "in" : "mm";

      const part: PartState = {
        id: cryptoId(),
        fileName: file.name,
        kind: "stl",
        buffer: buf,
        geometry: geom,
        baseBboxMm: { x: sz.x * (sourceUnits === "in" ? 25.4 : 1), y: sz.y * (sourceUnits === "in" ? 25.4 : 1), z: sz.z * (sourceUnits === "in" ? 25.4 : 1) },
        transform: { ...IDENTITY_TRANSFORM, scale: sourceUnits === "in" ? 25.4 : 1 },
        color: colorHex,
        sourceUnits,
      };
      updateActivePlate((p) => ({ ...p, parts: [...p.parts, part] }));
      setSelectedPartId(part.id);
      if (sourceUnits === "in") toast.info("Detected inch-based STL — auto-scaled to mm.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not load STL");
    } finally {
      setParsing(false);
      setUploading(false);
    }
  };

  const handleFetchUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      toast.error("Paste a URL to a .stl or .3mf file");
      return;
    }
    setUrlLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-model", { body: { url: trimmed } });
      if (error || !data?.base64) throw new Error(error?.message ?? data?.error ?? "Could not fetch model");
      const bin = atob(data.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.contentType });
      const f = new File([blob], data.fileName, { type: data.contentType });
      await handleFile(f);
      toast.success("Model loaded from URL");
    } catch (err: any) {
      toast.error(err.message ?? "Could not fetch URL");
    } finally {
      setUrlLoading(false);
    }
  };

  // ----- Part actions -----
  const duplicatePart = (id: string) => {
    const src = activePlate.parts.find((p) => p.id === id);
    if (!src) return;
    const copy: PartState = {
      ...src,
      id: cryptoId(),
      transform: { ...src.transform, tx: src.transform.tx + 30, ty: src.transform.ty + 30 },
    };
    updateActivePlate((p) => ({ ...p, parts: [...p.parts, copy] }));
    setSelectedPartId(copy.id);
  };
  const deletePart = (id: string) => {
    updateActivePlate((p) => ({ ...p, parts: p.parts.filter((q) => q.id !== id) }));
    if (selectedPartId === id) setSelectedPartId(null);
  };
  const centerPart = (id: string) => updatePart(id, { tx: 0, ty: 0 });
  const layFlat = (id: string) => updatePart(id, { rotX: 0, rotY: 0 });

  // ----- Plate actions -----
  const addPlate = () => {
    const p = makePlate(activePlate.plateId);
    setPlates((prev) => [...prev, p]);
    setActivePlateId(p.id);
    setSelectedPartId(null);
  };
  const removePlate = (id: string) => {
    setPlates((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) return [makePlate(DEFAULT_PLATE_ID)];
      return next;
    });
    if (activePlateId === id) {
      const next = plates.find((p) => p.id !== id);
      if (next) setActivePlateId(next.id);
    }
  };
  const setActivePlateModel = (plateId: string) => {
    updateActivePlate((p) => ({ ...p, plateId }));
  };

  // Mark dirty when slice settings change (material, infill, etc.)
  const settingsKey = `${material}|${costInputs.infillPct}|${costInputs.layerHeightMm}|${costInputs.walls}|${costInputs.supports}|${costInputs.scalePct}|${plateModel.x}x${plateModel.y}x${plateModel.z}`;
  const lastSettingsKey = useRef(settingsKey);
  useEffect(() => {
    if (lastSettingsKey.current !== settingsKey) {
      lastSettingsKey.current = settingsKey;
      setPlates((prev) => prev.map((p) => p.id === activePlateId ? { ...p, dirty: true } : p));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  // ----- Preview parts (transformed geometries) -----
  const collisions = useMemo(() => findCollisions(activePlate.parts), [activePlate.parts]);
  const overflow = useMemo(() => plateOverflow(activePlate.parts, plateModel), [activePlate.parts, plateModel]);

  const previewParts: PreviewPart[] = useMemo(
    () => activePlate.parts.map((p) => ({
      id: p.id,
      geometry: previewGeometry(p),
      color: p.color,
      selected: p.id === selectedPartId,
      collides: collisions.has(p.id),
    })),
    [activePlate.parts, selectedPartId, collisions],
  );

  // Handler: drag a part on plate
  const handleDragMove = (partId: string, dx: number, dy: number) => {
    const p = activePlate.parts.find((pp) => pp.id === partId);
    if (!p) return;
    updatePart(partId, { tx: p.transform.tx + dx, ty: p.transform.ty + dy });
  };

  // ----- Slice plate (manual) -----
  const handleSlicePlate = async () => {
    if (activePlate.parts.length === 0) {
      toast.error("Add a part to the plate first.");
      return;
    }
    setSlicing(true);
    try {
      // Bake each part: per-part-scale (transform.scale already includes inch→mm) + rotation, lay-flat, then translate.
      const baked: ArrayBuffer[] = [];
      for (const p of activePlate.parts) {
        const bb = transformedBbox(p);
        // We rotate + scale + drop-to-floor then translate. But previewGeometry already
        // encodes lay-flat + translate; for the bake we recompute from the original
        // buffer to avoid double-applying.
        const out = bakeStl(p.buffer, {
          preScale: p.transform.scale,
          rotXDeg: p.transform.rotX,
          rotYDeg: p.transform.rotY,
          rotZDeg: p.transform.rotZ,
          layFlatToPlate: true,
          translate: [p.transform.tx, p.transform.ty, 0],
        });
        // bb computed but not strictly needed — could be used to flag oversize before slicing
        void bb;
        baked.push(out);
      }
      const merged = mergeBinaryStls(baked);

      // Apply user-level scale slider on top of per-part scale (kept for global "make whole plate bigger")
      const userScale = costInputs.scalePct / 100;
      const sliceBuf = userScale === 1 ? merged : bakeStl(merged, { preScale: userScale });

      const result = await sliceStlBufferAccurate(sliceBuf, {
        material,
        infillPct: costInputs.infillPct,
        layerHeightMm: costInputs.layerHeightMm,
        walls: costInputs.walls,
        supports: costInputs.supports,
        sourceUnits: "mm",          // already baked into mm
        scale: 1,                   // already applied
        plate: plateModel,
      });

      if (result.weightG <= 0) {
        toast.error("Slicer returned no material usage. Try repairing the STL or changing settings.");
      } else {
        toast.success(`Plate sliced: ${result.weightG.toFixed(1)}g · ${formatMins(result.printMinutes)}`);
      }

      setPlates((prev) => prev.map((p) =>
        p.id === activePlateId ? { ...p, lastSlice: result, dirty: false } : p,
      ));
    } catch (err: any) {
      toast.error(err.message ?? "Slice failed");
    } finally {
      setSlicing(false);
    }
  };

  // ----- Quote inputs -----
  const baseWeightG = useMemo(() => {
    if (mfg) return mfg.totalWeightG;
    return activePlate.lastSlice?.weightG ?? 0;
  }, [mfg, activePlate.lastSlice]);
  const baseBboxMm = useMemo(() => {
    if (mfg) return mfg.bbox;
    return activePlate.lastSlice?.bbox ?? { x: 0, y: 0, z: 0 };
  }, [mfg, activePlate.lastSlice]);
  const basePrintMinutes = useMemo(() => {
    if (mfg) return mfg.printMinutes;
    return activePlate.lastSlice?.printMinutes ?? 0;
  }, [mfg, activePlate.lastSlice]);

  const totalWeightG = estimate?.weightG ?? baseWeightG;
  const baseQuote = estimate ? estimate.amountCents / 100 : baseWeightG * (MATERIAL_BASE_PRICE[material] ?? 0.2);
  const isStale = activePlate.dirty && activePlate.parts.length > 0 && !mfg;
  const hasAccurateQuote = mfg ? mfg.totalWeightG > 0 : activePlate.lastSlice?.weightG ? activePlate.lastSlice.weightG > 0 : false;

  // Printer matches
  const matches: (PrinterRow & ScoredPrinter & { fitsPlate: boolean })[] = useMemo(() => {
    if (totalWeightG <= 0 || isStale) return [];
    const refBbox = mfg ? mfg.bbox : baseBboxMm;
    return printers
      .map((p) => {
        const score = scorePrinter(p, { weightG: totalWeightG, material, colorName });
        const bv = parseBuildVolume(p.build_volume);
        const fitsPlate = bv ? checkFit(refBbox, { x: bv.x, y: bv.y, z: bv.z } as any).status !== "too-large" : true;
        return { ...p, ...score, fitsPlate };
      })
      .filter((p) => p.fitsPlate)
      .filter((p) => {
        if (!mfg) return true;
        const slotsNeeded = mfg.filaments.length;
        return p.has_ams && p.accepts_3mf && p.ams_slot_count >= slotsNeeded;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [printers, totalWeightG, material, colorName, mfg, baseBboxMm, isStale]);

  const mapPins = useMemo(
    () => matches
      .filter((m) => m.latitude != null && m.longitude != null)
      .map((m) => ({
        id: m.id, lng: m.longitude!, lat: m.latitude!,
        label: `${m.brand} ${m.model} · $${m.totalPrice.toFixed(2)}`,
        color: m.matchedHex ?? colorHex,
      })),
    [matches, colorHex],
  );

  if (loading) return <div className="container py-24">Loading…</div>;

  // 3MF: reassign one slot's color
  const reassignSlot = (slotIdx: number, hex: string) => {
    if (!mfg) return;
    const before = mfg.filaments.map((f) => ({ ...f }));
    const after = mfg.filaments.map((f, i) => (i === slotIdx ? { ...f, hex } : f));
    recolorBySlot(mfg.geometry, before, after);
    setMfg({ ...mfg, filaments: after });
  };

  const ensureFileSaved = async (): Promise<string | null> => {
    if (!user) return null;
    // For STL, save the merged plate buffer; for 3MF, save the original 3MF.
    let file: File | null = null;
    if (mfg && mfgFile) {
      file = mfgFile;
    } else if (activePlate.parts.length > 0) {
      const baked: ArrayBuffer[] = activePlate.parts.map((p) => bakeStl(p.buffer, {
        preScale: p.transform.scale,
        rotXDeg: p.transform.rotX, rotYDeg: p.transform.rotY, rotZDeg: p.transform.rotZ,
        layFlatToPlate: true,
        translate: [p.transform.tx, p.transform.ty, 0],
      }));
      const merged = mergeBinaryStls(baked);
      const name = activePlate.parts.length === 1 ? activePlate.parts[0].fileName : `plate-${plates.findIndex((pp) => pp.id === activePlateId) + 1}.stl`;
      file = new File([merged], name, { type: "model/stl" });
    }
    if (!file) return null;
    if (savedStlId) return savedStlId;

    const path = `${user.id}/${Date.now()}-${file.name}`;
    const contentType = mfg ? "model/3mf" : "model/stl";
    const { error: upErr } = await supabase.storage
      .from("stl-files")
      .upload(path, file, { contentType, upsert: false });
    if (upErr) throw upErr;

    const { data, error: insErr } = await supabase
      .from("stl_files")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        material,
        estimated_weight: Math.round(totalWeightG * 10) / 10,
        estimated_price: Number(baseQuote.toFixed(2)),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    setSavedStlId(data.id);
    return data.id;
  };

  const handleSaveQuote = async () => {
    if (totalWeightG <= 0) {
      toast.error("Slice the plate first.");
      return;
    }
    setSubmitting(true);
    try {
      await ensureFileSaved();
      toast.success("Quote saved!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBook = async (m: PrinterRow & ScoredPrinter) => {
    if (totalWeightG <= 0 || !user) {
      toast.error("Slice the plate first.");
      return;
    }
    try {
      const stlId = await ensureFileSaved();
      const amountCents = Math.max(100, Math.round(m.totalPrice * 100));
      const noteParts: string[] = [`${totalWeightG.toFixed(1)}g`];
      if (mfg) {
        noteParts.push(`${mfg.filaments.length} colors`);
        mfg.filaments.forEach((f, i) => noteParts.push(`Slot ${i + 1}: ${f.type} ${f.hex}`));
      } else if (activePlate.parts.length > 1) {
        noteParts.push(`${activePlate.parts.length} parts`);
      }
      setCheckoutPayload({
        printerId: m.id,
        stlFileId: stlId,
        makerId: m.owner_id,
        material,
        quantity: 1,
        amountCents,
        colorName: colorName ?? undefined,
        notes: noteParts.join(" · "),
        customerId: user.id,
        customerEmail: user.email ?? undefined,
      });
      setCheckoutOpen(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not start checkout");
    }
  };

  const openBulk = (m: PrinterRow) => { setBulkPrinter(m); setBulkOpen(true); };

  const hasAnyPart = activePlate.parts.length > 0 || !!mfg;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="In-browser slicer for STL & 3MF — instant 3D print quotes | PrintLoco"
        description="Drop STL/3MF files onto a virtual build plate, rotate and arrange them, slice in your browser, and book a local maker — all without installing software."
        path="/upload"
      />
      <Navbar />
      <main className="container max-w-6xl py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">In-browser slicer</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Arrange, slice, match — <span className="italic text-primary">all in your browser</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Drop one or more STLs onto a build plate, rotate and lay-flat, then press <strong>Slice plate</strong>.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* LEFT: workspace */}
          <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
            {/* Upload box */}
            <div>
              <div className="mb-3 inline-flex rounded-full border border-border bg-background p-0.5 text-xs">
                {(["file", "url"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSourceMode(m)}
                    className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                      sourceMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "file" ? "File" : "From URL"}
                  </button>
                ))}
              </div>

              {sourceMode === "file" ? (
                <label
                  htmlFor="stl"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                    hasAnyPart ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    {hasAnyPart ? <FileBox className="h-6 w-6" /> : <UploadIcon className="h-6 w-6" />}
                  </div>
                  <div className="font-display text-base font-semibold">
                    {hasAnyPart ? "Drop another file to add to the plate" : "Click to upload an STL or .3mf"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Max 50MB</div>
                  <input
                    id="stl"
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.3mf,model/stl,model/3mf"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) handleFile(f);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                </label>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/model.stl"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button onClick={handleFetchUrl} disabled={urlLoading}>
                    {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                  </Button>
                </div>
              )}
            </div>

            {/* Upload / slice status banner — always visible while work is happening */}
            {(uploading || parsing || slicing) && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploading
                    ? `Received ${uploadFileName ?? "file"} — uploading…`
                    : parsing
                      ? "Parsing model…"
                      : "Slicing in browser…"}
                </div>
                {slicing && (
                  <div className="mt-2 space-y-1">
                    <Progress value={sliceProgress} className="h-1.5" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{sliceStage || "Working…"}</span>
                      <span className="tabular-nums">{Math.round(sliceProgress)}%</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Checkout will unlock automatically when the slice finishes.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Plate tabs (only show in STL workflow) */}
            {!mfg && (
              <div className="space-y-3">
                <PlateTabs
                  plates={plates}
                  activeId={activePlateId}
                  onSelect={(id) => { setActivePlateId(id); setSelectedPartId(null); }}
                  onAdd={addPlate}
                  onRemove={removePlate}
                />

                {/* Plate model selector */}
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Build plate</Label>
                    {activePlate.parts.length > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        overflow ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                      }`}>
                        {overflow ? "Off plate" : "Fits"}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {BUILD_PLATES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivePlateModel(p.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          activePlate.plateId === p.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                        title={`${p.brand} ${p.model} — ${p.x} × ${p.y} × ${p.z} mm`}
                      >
                        {p.short}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {plateModel.brand} {plateModel.model} · {plateModel.x} × {plateModel.y} × {plateModel.z} mm
                  </div>
                </div>
              </div>
            )}

            {/* 3D preview */}
            {(hasAnyPart) && (
              <div className="rounded-2xl border border-border bg-gradient-hero p-2">
                <div className="relative h-80 w-full overflow-hidden rounded-xl">
                  {(parsing || slicing) && (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-background/70 backdrop-blur-sm">
                      <div className="w-72 max-w-[90%] space-y-3 rounded-2xl border border-border bg-card/90 p-4 shadow-lg">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          {slicing ? "Slicing in browser…" : "Loading model…"}
                        </div>
                        {slicing && (
                          <>
                            <Progress value={sliceProgress} className="h-2" />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{sliceStage || "Working…"}</span>
                              <span className="tabular-nums">{Math.round(sliceProgress)}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {mfg ? (
                    <StlPreview
                      geometry={mfg.geometry}
                      color={colorHex}
                      vertexColors
                      plate={plateModel}
                      className="h-full w-full"
                    />
                  ) : (
                    <StlPreview
                      parts={previewParts}
                      plate={plateModel}
                      overflow={overflow}
                      onSelect={setSelectedPartId}
                      onDragMove={handleDragMove}
                      className="h-full w-full"
                    />
                  )}
                </div>
                {!mfg && activePlate.parts.length > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
                    <span>Click a part to select · drag to move · use the panel below to rotate</span>
                    <Button size="sm" variant="hero" onClick={handleSlicePlate} disabled={slicing}>
                      <Play className="mr-1 h-3.5 w-3.5" />
                      {slicing ? "Slicing…" : "Slice plate"}
                    </Button>
                  </div>
                )}
                {overflow && !mfg && (
                  <div className="mt-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                    One or more parts overflow {plateModel.short}. Move/scale them or pick a larger plate.
                  </div>
                )}
              </div>
            )}

            {/* Per-part transform panel */}
            {!mfg && activePlate.parts.length > 0 && (
              <PartTransformPanel
                part={selectedPart ?? activePlate.parts[0]}
                onChange={(patch) => updatePart((selectedPart ?? activePlate.parts[0]).id, patch)}
                onDuplicate={() => duplicatePart((selectedPart ?? activePlate.parts[0]).id)}
                onDelete={() => deletePart((selectedPart ?? activePlate.parts[0]).id)}
                onCenter={() => centerPart((selectedPart ?? activePlate.parts[0]).id)}
                onLayFlat={() => layFlat((selectedPart ?? activePlate.parts[0]).id)}
                plate={{ x: plateModel.x, y: plateModel.y }}
              />
            )}

            {/* Parts list */}
            {!mfg && activePlate.parts.length > 1 && (
              <div className="rounded-2xl border border-border bg-background/40 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Parts on this plate ({activePlate.parts.length})
                </div>
                <ul className="space-y-1">
                  {activePlate.parts.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPartId(p.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                          selectedPartId === p.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-background"
                        }`}
                      >
                        <span className="truncate">{p.fileName}</span>
                        <span className="text-[10px] tabular-nums opacity-70">
                          {Math.round(p.transform.tx)}, {Math.round(p.transform.ty)} mm
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3MF: multi-color slot list */}
            {mfg && (
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Multi-color print · {mfg.filaments.length} slots
                </div>
                <div className="mt-3 space-y-2">
                  {mfg.filaments.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-card p-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: f.hex }} />
                        <div>
                          <div className="text-sm font-semibold">Slot {i + 1} · {f.type}</div>
                          <div className="text-xs text-muted-foreground">
                            {mfg.weightPerSlot[i]?.toFixed(1) ?? "0.0"}g
                          </div>
                        </div>
                      </div>
                      <input
                        type="color"
                        value={f.hex}
                        onChange={(e) => reassignSlot(i, e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
                        aria-label={`Slot ${i + 1} color`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STL: material + color */}
            {!mfg && (
              <>
                <div>
                  <Label>Material</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MATERIALS.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setMaterial(m)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                          material === m
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-foreground/30"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <Label>Color</Label>
                  </div>
                  <div className="mt-2">
                    <ColorPicker
                      value={colorName}
                      onChange={(name, hex) => { setColorName(name); setColorHex(hex); }}
                    />
                  </div>
                </div>
              </>
            )}
          </section>

          {/* RIGHT: quote + matches */}
          <section className="space-y-6">
            {hasAnyPart && ((mfg && hasAccurateQuote) || activePlate.lastSlice) ? (
              <>
                <CostEstimator
                  base={{
                    weightG: baseWeightG,
                    printMinutes: basePrintMinutes,
                    bboxMm: baseBboxMm,
                    triangles: mfg?.triangles ?? activePlate.lastSlice?.triangles,
                  }}
                  inputs={costInputs}
                  onChange={setCostInputs}
                  onResolved={setEstimate}
                  hideMaterial={!!mfg}
                  dirty={isStale}
                  onSlice={handleSlicePlate}
                  slicing={slicing}
                />
                <div className="flex gap-2">
                  <Button variant="hero" onClick={handleSaveQuote} disabled={submitting || isStale || slicing || parsing}>
                    {slicing ? "Slicing…" : submitting ? "Saving…" : "Save quote"}
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/printers")}>Browse all printers</Button>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <div className="mt-3 font-display text-lg font-semibold">
                  {hasAnyPart ? "Press \"Slice plate\" to compute the quote" : "Drop a model to start"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {hasAnyPart
                    ? "Settings only update the quote when you slice — just like a desktop slicer."
                    : "We slice locally — nothing leaves your browser until you save."}
                </div>
                {hasAnyPart && !mfg && (
                  <Button className="mt-4" variant="hero" onClick={handleSlicePlate} disabled={slicing}>
                    <Play className="mr-1 h-4 w-4" /> {slicing ? "Slicing…" : "Slice plate"}
                  </Button>
                )}
              </div>
            )}

            {totalWeightG > 0 && !isStale && hasAccurateQuote && matches.length > 0 && (
              <>
                <div className="rounded-3xl border border-border bg-card p-2 shadow-soft">
                  <PrinterMap pins={mapPins} className="h-64 w-full overflow-hidden rounded-2xl" />
                </div>

                <div>
                  <h2 className="font-display text-xl font-semibold">Top matches</h2>
                  {mfg && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Filtered to AMS-equipped makers with at least {mfg.filaments.length} slots.
                    </p>
                  )}
                  <div className="mt-3 space-y-3">
                    {matches.map((m) => (
                      <article key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:border-primary/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {m.neighborhood || m.city || "Local"}
                              {m.distanceKm != null && <span>· {m.distanceKm.toFixed(1)} km</span>}
                            </div>
                            <div className="mt-1 truncate font-display text-lg font-semibold">{m.brand} {m.model}</div>
                            <div className="text-xs text-muted-foreground">by {m.profiles?.full_name || "Anonymous Maker"}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                              {m.has_ams && (
                                <Badge tone="ok"><Layers className="h-3 w-3" /> AMS · {m.ams_slot_count}</Badge>
                              )}
                              <Badge tone={m.hasMaterial ? "ok" : "off"}>{m.hasMaterial ? "✓" : "✗"} {material}</Badge>
                              {colorName && !mfg && (
                                <Badge tone={m.hasColor ? "ok" : "off"}>
                                  <span className="inline-block h-2 w-2 rounded-full border border-border" style={{ backgroundColor: m.matchedHex ?? "transparent" }} />
                                  {m.hasColor ? colorName : `no ${colorName}`}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-xl font-semibold">${m.totalPrice.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">${Number(m.price_per_gram).toFixed(2)}/g</div>
                            <div className="mt-2 inline-flex h-6 items-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                              {m.score}% match
                            </div>
                            <div className="mt-3 flex flex-col gap-1.5">
                              <Button size="sm" variant="hero" onClick={() => handleBook(m)} disabled={slicing || parsing || isStale}>
                                <CreditCard className="h-3.5 w-3.5" /> {slicing ? "Slicing…" : "Book"}
                              </Button>
                              {m.accepts_bulk && (
                                <Button size="sm" variant="ghost" onClick={() => openBulk(m)}>
                                  <Package className="h-3.5 w-3.5" /> Bulk
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
        <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} payload={checkoutPayload} />
        <BulkQuoteDialog open={bulkOpen} onOpenChange={setBulkOpen} printer={bulkPrinter} />
      </main>
      <Footer />
    </div>
  );
};

const Badge = ({ children, tone }: { children: React.ReactNode; tone: "ok" | "off" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
    tone === "ok" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
  }`}>
    {children}
  </span>
);

function formatMins(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export default Upload;
