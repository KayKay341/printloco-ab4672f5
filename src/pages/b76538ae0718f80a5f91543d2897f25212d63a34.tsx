import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileBox,
  HelpCircle,
  Layers,
  Link as LinkIcon,
  Ruler,
  Settings2,
  Sparkles,
  Trash2,
  Upload as UploadIcon,
  Weight,
  Wand2,
  Zap,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import PrinterMatches from "@/components/PrinterMatches";
import SEO from "@/components/SEO";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import StlPreview from "@/components/StlPreview";
import CostEstimator from "@/components/CostEstimator";
import CheckoutDialog from "@/components/CheckoutDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parse3mf } from "@/lib/threeMfParser";
import { sliceStlBufferAccurate, type SliceResult } from "@/lib/stlSlicer";
import {
  DEFAULT_SLICER_SETTINGS,
  calculateSlicerStats,
  generateBasicGcode,
  geometryToModelInfo,
  safeBaseName,
  settingsToText,
  type SlicerSettings,
  type SlicerStats,
} from "@/lib/slicerEstimator";
import { aiContextStore } from "@/lib/aiContext";
import { useAuth } from "@/hooks/useAuth";
import { autoOrient, smartLayout } from "@/lib/makerSetSmart";
import { type Unit, fromMm, formatUnit } from "@/lib/units";
import {
  PlateState,
  PartState,
  makePlate,
  IDENTITY_TRANSFORM,
  previewGeometry as getPreviewGeometry,
  transformedBbox,
  findCollisions,
  cryptoId
} from "@/lib/sliceJob";
import { BUILD_PLATES, getPlate, DEFAULT_PLATE_ID } from "@/lib/buildPlates";
import { geometryToBinaryStl, mergeBinaryStls } from "@/lib/stlTransform";
import PlateTabs from "@/components/PlateTabs";
import PartTransformPanel from "@/components/PartTransformPanel";

const SETTINGS_KEY = "printloco-slicer-settings";

/** Beginner-friendly quality presets — plain English, no jargon. */
const QUALITY_PRESETS = [
  {
    id: "draft",
    name: "Quick Draft",
    description: "Fastest print. Best for testing how a model fits.",
    emoji: "⚡",
    settings: { layerHeight: 0.3, infill: 10, speed: 70 },
  },
  {
    id: "standard",
    name: "Standard",
    description: "Balanced quality and speed. A great default.",
    emoji: "✨",
    settings: { layerHeight: 0.2, infill: 20, speed: 50 },
  },
  {
    id: "detailed",
    name: "Detailed",
    description: "Smoother surface for figurines and display pieces.",
    emoji: "🎨",
    settings: { layerHeight: 0.12, infill: 25, speed: 40 },
  },
  {
    id: "strong",
    name: "Strong & Durable",
    description: "Heavy infill for tools, brackets, and parts that bear weight.",
    emoji: "🛠️",
    settings: { layerHeight: 0.2, infill: 60, speed: 45 },
  },
] as const;

const MATERIAL_INFO: Record<SlicerSettings["material"], { label: string; description: string }> = {
  PLA: { label: "PLA — Easy", description: "Easiest to print. Great for decor, toys, and prototypes." },
  PETG: { label: "PETG — Tough", description: "Stronger and slightly flexible. Good for outdoor parts." },
  ABS: { label: "ABS — Heat-resistant", description: "For hot environments. Needs an enclosed printer." },
};

const Upload = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [plates, setPlates] = useState<PlateState[]>(() => [makePlate(DEFAULT_PLATE_ID)]);
  const [activePlateId, setActivePlateId] = useState<string>(plates[0].id);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<SlicerSettings>(() => loadSettings());
  const [activePreset, setActivePreset] = useState<string>("standard");
  const [processing, setProcessing] = useState(false);
  const [slicing, setSlicing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [unit, setUnit] = useState<Unit>("mm");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");

  // New "View" state
  const [clippingZ, setClippingZ] = useState(1);
  const [isWireframe, setIsWireframe] = useState(false);

  const activePlate = useMemo(() => plates.find(p => p.id === activePlateId)!, [plates, activePlateId]);
  const plateConfig = useMemo(() => getPlate(activePlate.plateId), [activePlate.plateId]);
  const selectedPart = useMemo(() => activePlate.parts.find(p => p.id === selectedPartId), [activePlate.parts, selectedPartId]);

  // Derived preview parts for StlPreview
  const previewParts = useMemo(() => {
    const collisions = findCollisions(activePlate.parts);
    return activePlate.parts.map(p => ({
      id: p.id,
      geometry: getPreviewGeometry(p),
      color: p.color,
      selected: p.id === selectedPartId,
      collides: collisions.has(p.id)
    }));
  }, [activePlate.parts, selectedPartId]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("settings");
    if (!shared) return;
    try {
      const decoded = JSON.parse(atob(shared)) as SlicerSettings;
      setSettings(sanitizeSettings(decoded));
      toast.success("Shared settings loaded");
    } catch {
      toast.error("Could not load shared settings");
    }
  }, []);

  const stats: SlicerStats | null = useMemo(() => {
    let totalWeight = 0;
    let totalTime = 0;
    let totalVolume = 0;
    let totalTriangles = 0;

    for (const p of plates) {
      if (p.lastSlice) {
        totalWeight += p.lastSlice.weightG;
        totalTime += p.lastSlice.printMinutes;
        totalVolume += p.lastSlice.volumeMm3;
        totalTriangles += p.lastSlice.triangles;
      } else {
        for (const part of p.parts) {
          const info = geometryToModelInfo(part.geometry);
          const h = calculateSlicerStats(info, settings);
          if (h) {
            totalWeight += h.weightG * part.transform.scale;
            totalTime += h.printMinutes;
            totalVolume += info.volumeMm3 * part.transform.scale;
            totalTriangles += info.triangles;
          }
        }
      }
    }

    if (totalWeight === 0) return null;

    return {
      layers: 0,
      printMinutes: totalTime,
      weightG: totalWeight,
      materialCost: totalWeight * 0.05,
      dimensions: {
        width: 0, height: 0, depth: 0,
        volumeMm3: totalVolume,
        triangles: totalTriangles,
      },
      source: "heuristic"
    };
  }, [plates, settings]);

  // Sync with AI Assistant context
  useEffect(() => {
    const mainPart = activePlate.parts[0];
    aiContextStore.set({
      serviceName: "3D Printing",
      fileName: mainPart?.fileName ?? (plates.length > 1 ? `${plates.length} plates` : undefined),
      widthMm: mainPart ? Math.round(mainPart.baseBboxMm.x * mainPart.transform.scale) : undefined,
      heightMm: mainPart ? Math.round(mainPart.baseBboxMm.y * mainPart.transform.scale) : undefined,
      thicknessMm: mainPart ? Math.round(mainPart.baseBboxMm.z * mainPart.transform.scale) : undefined,
      material: settings.material,
      quantity: plates.reduce((acc, p) => acc + p.parts.length, 0),
      unit: unit,
    });
  }, [plates, settings.material, unit]);

  const handleMakerSetSmart = () => {
    if (activePlate.parts.length === 0) return;
    
    setPlates(prev => prev.map(p => {
      if (p.id !== activePlateId) return p;
      
      // 1. Auto-orient all parts
      const orientedParts = p.parts.map(part => {
        const bestRot = autoOrient(part.geometry);
        return {
          ...part,
          transform: {
            ...part.transform,
            rotX: bestRot.x,
            rotY: bestRot.y,
            rotZ: bestRot.z,
          }
        };
      });

      // 2. Smart Layout (packing)
      const rects = orientedParts.map(part => {
        const bbox = transformedBbox(part);
        return {
          width: bbox.max.x - bbox.min.x,
          depth: bbox.max.y - bbox.min.y
        };
      });

      const positions = smartLayout(rects, plateConfig);
      
      const packedParts = orientedParts.map((part, i) => ({
        ...part,
        transform: {
          ...part.transform,
          tx: positions[i].x,
          ty: positions[i].y
        }
      }));

      return { ...p, parts: packedParts, dirty: true };
    }));

    toast.success("Build plate optimized with Maker Set Smart");
  };

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "stl" && ext !== "obj" && ext !== "3mf") {
      toast.error("Please upload an STL, OBJ, or 3MF file.");
      return;
    }
    
    setProcessing(true);
    try {
      let geometry: THREE.BufferGeometry;

      if (ext === "3mf") {
        geometry = await load3mf(file);
      } else if (ext === "obj") {
        const res = await loadObjWithColors(file);
        geometry = res.geometry;
      } else {
        geometry = await loadStl(file);
      }

      const info = geometryToModelInfo(geometry);
      const newPart: PartState = {
        id: cryptoId(),
        fileName: file.name,
        kind: ext as any,
        buffer: await file.arrayBuffer(),
        geometry,
        baseBboxMm: { x: info.width, y: info.height, z: info.depth },
        transform: { ...IDENTITY_TRANSFORM },
        color: "#9333EA",
        sourceUnits: unit === "in" ? "in" : "mm"
      };

      setPlates(prev => prev.map(p => {
        if (p.id !== activePlateId) return p;
        return { ...p, parts: [...p.parts, newPart], dirty: true };
      }));
      setSelectedPartId(newPart.id);
      toast.success(`Added ${file.name}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load file");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const updatePartTransform = (partId: string, patch: Partial<PartState["transform"]>) => {
    setPlates(prev => prev.map(p => ({
      ...p,
      parts: p.parts.map(part => part.id === partId ? { ...part, transform: { ...part.transform, ...patch } } : part),
      dirty: p.parts.some(part => part.id === partId) ? true : p.dirty
    })));
  };

  const duplicatePart = (partId: string) => {
    setPlates(prev => prev.map(p => {
      const part = p.parts.find(x => x.id === partId);
      if (!part) return p;
      const copy: PartState = { ...part, id: cryptoId(), transform: { ...part.transform, tx: part.transform.tx + 10, ty: part.transform.ty + 10 } };
      return { ...p, parts: [...p.parts, copy], dirty: true };
    }));
  };

  const deletePart = (partId: string) => {
    setPlates(prev => prev.map(p => ({
      ...p,
      parts: p.parts.filter(x => x.id !== partId),
      dirty: true
    })));
    if (selectedPartId === partId) setSelectedPartId(null);
  };

  const runAccurateSlice = async () => {
    if (activePlate.parts.length === 0) return;
    setSlicing(true);
    try {
      const bakedBuffers = activePlate.parts.map(p => {
        const g = getPreviewGeometry(p);
        const buf = geometryToBinaryStl(g);
        g.dispose();
        return buf;
      });
      
      const merged = mergeBinaryStls(bakedBuffers);
      const result = await sliceStlBufferAccurate(merged, {
        material: settings.material,
        infillPct: settings.infill,
        layerHeightMm: settings.layerHeight,
        plate: plateConfig
      });
      
      setPlates(prev => prev.map(p => p.id === activePlateId ? { ...p, lastSlice: result, dirty: false } : p));
    } catch (e) {
      console.error(e);
      toast.error("Slicing failed");
    } finally {
      setSlicing(false);
    }
  };

  const updateSetting = <K extends keyof SlicerSettings>(key: K, value: SlicerSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setActivePreset("custom");
    setPlates(prev => prev.map(p => ({ ...p, dirty: true })));
  };

  const applyPreset = (preset: (typeof QUALITY_PRESETS)[number]) => {
    setSettings((current) => ({ ...current, ...preset.settings }));
    setActivePreset(preset.id);
    setPlates(prev => prev.map(p => ({ ...p, dirty: true })));
    toast.success(`${preset.name} applied`);
  };

  const { user } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null);

  const handlePrinterSelect = (p: any, totalCost: number) => {
    if (!user) {
      toast.error("Sign in to place an order");
      return;
    }
    if (activePlate.parts.length === 0) return;

    setCheckoutPayload({
      printerId: p.id,
      makerId: p.owner_id || "demo",
      stlFileId: null,
      material: settings.material,
      quantity: 1,
      amountCents: Math.round(totalCost * 100),
      customerId: user.id,
      customerEmail: user.email,
      printerLabel: `${p.brand} ${p.model}`,
      fileName: `${activePlate.parts.length} parts across ${plates.length} plates`,
      weightG: stats?.weightG ?? 0,
      deliveryMethod,
    });
    setCheckoutOpen(true);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground">
        <SEO
          title="3D Print Quote | PrintLoco"
          description="Advanced multi-part 3D slicer with auto-matching local makers."
          path="/upload"
        />
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
          <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Step 1 of 3 — Build your plate
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold text-foreground sm:text-5xl">
                Multi-part job setup
              </h1>
            </div>
            
            <PlateTabs 
              plates={plates} 
              activeId={activePlateId} 
              onSelect={setActivePlateId} 
              onAdd={() => {
                const p = makePlate(DEFAULT_PLATE_ID);
                setPlates([...plates, p]);
                setActivePlateId(p.id);
              }}
              onRemove={(id) => {
                const filtered = plates.filter(p => p.id !== id);
                if (filtered.length === 0) return;
                setPlates(filtered);
                if (activePlateId === id) setActivePlateId(filtered[0].id);
              }}
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            <section className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
                <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-secondary/30 to-accent-soft/30">
                  {activePlate.parts.length > 0 ? (
                    <div className="relative h-full w-full flex">
                      <div className="flex-1 relative">
                        <StlPreview
                          parts={previewParts}
                          plate={plateConfig}
                          className="h-full w-full"
                          clippingPlaneZ={clippingZ}
                          wireframe={isWireframe}
                          unit={unit}
                          onSelect={setSelectedPartId}
                          onDragMove={(id, dx, dy) => {
                            const part = activePlate.parts.find(p => p.id === id);
                            if (part) updatePartTransform(id, { tx: part.transform.tx + dx, ty: part.transform.ty + dy });
                          }}
                        />
                        
                        <div className="absolute left-4 top-4 flex flex-col gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsWireframe(!isWireframe)}
                            className={`h-8 gap-1.5 rounded-full shadow-soft backdrop-blur-sm ${isWireframe ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background/80 hover:bg-background'}`}
                          >
                            <Layers className="h-3.5 w-3.5" />
                            {isWireframe ? 'Shaded' : 'Wireframe'}
                          </Button>

                          <div className="flex items-center gap-1 rounded-full bg-background/80 p-1 backdrop-blur-sm ring-1 ring-border shadow-sm w-fit">
                            {(["mm", "in"] as Unit[]).map((u) => (
                              <button
                                key={u}
                                type="button"
                                onClick={() => setUnit(u)}
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                                  unit === u
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {u}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="w-12 bg-background/40 backdrop-blur-sm border-l border-border flex flex-col items-center py-6 gap-3">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="text-[10px] font-bold uppercase tracking-tighter vertical-text text-muted-foreground">Layers</div>
                          </TooltipTrigger>
                          <TooltipContent side="left">Inspect print layers</TooltipContent>
                        </Tooltip>
                        <div className="flex-1 w-1 relative flex justify-center">
                          <Slider
                            orientation="vertical"
                            value={[clippingZ * 100]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(v) => setClippingZ(v[0] / 100)}
                            className="h-full"
                          />
                        </div>
                        <div className="text-[10px] font-bold text-foreground">{Math.round(clippingZ * 100)}%</div>
                      </div>

                      {slicing && (
                        <div className="absolute right-16 top-4 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-soft backdrop-blur-sm">
                          <Zap className="h-3 w-3 animate-pulse" />
                          Analyzing plate…
                        </div>
                      )}
                    </div>
                  ) : (
                    <UploadDropzone
                      processing={processing}
                      dragging={dragging}
                      onDragState={setDragging}
                      onFile={handleFile}
                      inputRef={inputRef}
                    />
                  )}

                  {activePlate.parts.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                      <div className="flex gap-2 pointer-events-auto">
                        <Button
                          variant="hero"
                          size="sm"
                          onClick={handleMakerSetSmart}
                          className="h-8 gap-1.5 rounded-full shadow-soft"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> Maker Set Smart
                        </Button>
                        <div className="h-8 w-px bg-white/20 mx-1" />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-1.5 rounded-full shadow-soft"
                          onClick={() => inputRef.current?.click()}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Part
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {activePlate.parts.length > 0 && (
                  <div className="border-t border-border bg-muted/30 px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Parts on Plate {plates.findIndex(p => p.id === activePlateId) + 1}</div>
                      <div className="text-[10px] text-muted-foreground">{activePlate.parts.length} total</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activePlate.parts.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => setSelectedPartId(p.id)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                            selectedPartId === p.id ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:border-foreground/20'
                          }`}
                        >
                          <FileBox className="h-3 w-3 opacity-70" />
                          <span className="max-w-[120px] truncate">{p.fileName}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deletePart(p.id); }}
                            className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedPart && (
                <PartTransformPanel 
                  part={selectedPart}
                  plate={plateConfig}
                  onChange={(p) => updatePartTransform(selectedPart.id, p)}
                  onDuplicate={() => duplicatePart(selectedPart.id)}
                  onDelete={() => deletePart(selectedPart.id)}
                  onCenter={() => updatePartTransform(selectedPart.id, { tx: 0, ty: 0 })}
                  onLayFlat={() => {
                    const bestRot = autoOrient(selectedPart.geometry);
                    updatePartTransform(selectedPart.id, { rotX: bestRot.x, rotY: bestRot.y, rotZ: bestRot.z });
                  }}
                />
              )}

              {stats && (
                <div className="space-y-6">
                  <CostEstimator
                    base={{
                      weightG: stats.weightG,
                      printMinutes: stats.printMinutes,
                      bboxMm: { x: 0, y: 0, z: 0 },
                      triangles: stats.dimensions.triangles
                    }}
                    inputs={{
                      units: unit,
                      sourceUnits: "mm",
                      scalePct: 100,
                      quantity: 1,
                      material: settings.material,
                      infillPct: settings.infill,
                      layerHeightMm: settings.layerHeight,
                      walls: 3,
                      supports: false,
                      rush: false,
                      deliveryMethod,
                    }}
                    onChange={(i) => {
                      if (i.units !== unit) setUnit(i.units);
                      if (i.deliveryMethod !== deliveryMethod) setDeliveryMethod(i.deliveryMethod);
                      setSettings(s => ({
                        ...s,
                        material: i.material as any,
                        infill: i.infillPct,
                        layerHeight: i.layerHeightMm,
                      }));
                    }}
                    dirty={activePlate.dirty}
                    onSlice={runAccurateSlice}
                    slicing={slicing}
                  />

                  <PrinterMatches 
                    material={settings.material} 
                    weightGrams={stats.weightG} 
                    onSelect={handlePrinterSelect}
                  />
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-foreground">Print Settings</h2>
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quality Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {QUALITY_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          className={`flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-all ${
                            activePreset === preset.id
                              ? "border-primary bg-primary/[0.03] shadow-soft"
                              : "border-border hover:border-foreground/20 hover:bg-muted/50"
                          }`}
                        >
                          <span className="text-lg">{preset.emoji}</span>
                          <span className="mt-1.5 text-xs font-bold text-foreground leading-tight">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Material</Label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent className="max-w-[200px] text-xs">Different plastics have different strengths and heat resistances.</TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={settings.material}
                      onValueChange={(v) => updateSetting("material", v as SlicerSettings["material"])}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border bg-background shadow-soft">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border">
                        {Object.entries(MATERIAL_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key} className="rounded-lg py-3">
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold text-foreground">{info.label}</div>
                              <div className="text-[10px] text-muted-foreground">{info.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FriendlySlider
                    label="Infill Density"
                    help="Higher density means a stronger, heavier part."
                    value={settings.infill}
                    min={0}
                    max={100}
                    step={5}
                    suffix="%"
                    onChange={(v) => updateSetting("infill", v)}
                  />

                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Advanced Settings
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  </button>

                  {showAdvanced && (
                    <div className="space-y-6 pt-2">
                      <FriendlySlider
                        label="Layer Height"
                        help="Smaller layers look smoother but take much longer to print."
                        value={settings.layerHeight}
                        min={0.04}
                        max={0.4}
                        step={0.01}
                        suffix="mm"
                        onChange={(v) => updateSetting("layerHeight", v)}
                      />
                      <FriendlySlider
                        label="Print Speed"
                        help="Slow prints usually have higher surface quality."
                        value={settings.speed}
                        min={10}
                        max={150}
                        step={5}
                        suffix="mm/s"
                        onChange={(v) => updateSetting("speed", v)}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/[0.02] p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 p-2"><Wand2 className="h-5 w-5 text-primary" /></div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground leading-tight">Maker Set Smart</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Automatically optimizes part orientation and packs items onto build plates for the fastest, most reliable print.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
        <Footer />
        <CheckoutDialog 
          open={checkoutOpen} 
          onOpenChange={setCheckoutOpen} 
          payload={checkoutPayload} 
        />
      </div>
    </TooltipProvider>
  );
};

/* -------------------------- Sub-components -------------------------- */

const UploadDropzone = ({
  processing,
  dragging,
  onDragState,
  onFile,
  inputRef,
}: {
  processing: boolean;
  dragging: boolean;
  onDragState: (value: boolean) => void;
  onFile: (file: File) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div
    className={`absolute inset-0 m-6 flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed text-center transition-all ${
      dragging
        ? "border-primary bg-primary/10 scale-[1.02]"
        : "border-primary/20 bg-card/40 hover:border-primary/40 hover:bg-card/60"
    }`}
    onDragOver={(event) => {
      event.preventDefault();
      onDragState(true);
    }}
    onDragLeave={() => onDragState(false)}
    onDrop={(event) => {
      event.preventDefault();
      onDragState(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onFile(file);
    }}
  >
    <input
      ref={inputRef}
      type="file"
      accept=".stl,.obj,.3mf,model/stl,text/plain,model/3mf"
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onFile(file);
      }}
    />
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={processing}
      className="flex flex-col items-center px-10 py-12 disabled:opacity-60"
    >
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary shadow-soft">
        <UploadIcon className="h-10 w-10" />
      </div>
      <div className="mt-6 font-display text-3xl font-bold text-foreground">
        {processing ? "Loading model…" : "Upload a 3D File"}
      </div>
      <div className="mt-2 text-slate-500 max-w-[260px] leading-relaxed">
        Drag and drop or <span className="font-bold text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary">choose a file</span> from your computer.
      </div>
    </button>
  </div>
);

const FriendlySlider = ({
  label,
  help,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
          <TooltipContent className="max-w-[200px] text-xs">{help}</TooltipContent>
        </Tooltip>
      </div>
      <div className="text-sm font-bold text-foreground">{value}{suffix}</div>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(v[0])}
      className="py-2"
    />
  </div>
);

/* -------------------------- Helpers -------------------------- */

const loadSettings = (): SlicerSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return sanitizeSettings(JSON.parse(saved));
  } catch {}
  return DEFAULT_SLICER_SETTINGS;
};

const sanitizeSettings = (s: any): SlicerSettings => {
  return {
    ...DEFAULT_SLICER_SETTINGS,
    ...s,
    layerHeight: clamp(s.layerHeight ?? DEFAULT_SLICER_SETTINGS.layerHeight, 0.04, 0.4),
    infill: clamp(s.infill ?? DEFAULT_SLICER_SETTINGS.infill, 0, 100),
    speed: clamp(s.speed ?? DEFAULT_SLICER_SETTINGS.speed, 10, 150),
  };
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

async function loadStl(file: File): Promise<THREE.BufferGeometry> {
  const buffer = await file.arrayBuffer();
  const geometry = new STLLoader().parse(buffer);
  geometry.computeVertexNormals();
  return geometry;
}

async function loadObjWithColors(file: File): Promise<{ geometry: THREE.BufferGeometry; hasColors: boolean }> {
  const text = await file.text();
  const group = new OBJLoader().parse(text);
  group.updateMatrixWorld(true);
  const positions: number[] = [];
  const colors: number[] = [];
  let hasColors = false;

  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    
    if (!position) return;
    
    const vertex = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      positions.push(vertex.x, vertex.y, vertex.z);
      
      if (color) {
        hasColors = true;
        colors.push(color.getX(i), color.getY(i), color.getZ(i));
      }
    }
  });

  if (positions.length === 0) throw new Error("OBJ contains no mesh geometry.");
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (hasColors) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }
  geometry.computeVertexNormals();
  return { geometry, hasColors };
}

async function load3mf(file: File): Promise<THREE.BufferGeometry> {
  const buffer = await file.arrayBuffer();
  const result = await parse3mf(buffer);
  if (!result.geometry) throw new Error("Could not extract geometry from 3MF");
  result.geometry.computeVertexNormals();
  return result.geometry;
}

export default Upload;
