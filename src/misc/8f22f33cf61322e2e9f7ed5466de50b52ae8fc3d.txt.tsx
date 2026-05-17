import { useEffect, useMemo, useRef, useState } from "react";
import { 
  Ruler, 
  Scan, 
  AlertCircle, 
  Maximize, 
  Layers, 
  Zap, 
  Package,
  RotateCw,
  Grid3X3,
  Settings2,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { type Unit, fromMm, formatUnit } from "@/lib/units";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import LayoutVisualization from "./LayoutVisualization";
import { 
  LaserLayoutOptimizer, 
  STANDARD_SHEETS, 
  SAMPLE_MACHINES,
  type LaserPart, 
  type MaterialSheet, 
  type LayoutResult,
  type PlacedPart,
  type LaserPath,
  type LaserMachine
} from "@/lib/laserLayout";

type SpecsDetected = {
  widthMm: number;
  heightMm: number;
  cutLengthMm: number;
  engraveAreaCm2: number;
  sheetsNeeded?: number;
  sheetName?: string;
  sheetPriceCents?: number;
};

type Props = {
  file: File | null;
  unit?: Unit;
  onSpecsDetected?: (specs: SpecsDetected) => void;
  onLayoutOptimized?: (layout: LayoutResult) => void;
};

type ParsedSvg = {
  raw: string;
  widthMm: number;
  heightMm: number;
  cutLengthMm: number;
  engraveAreaCm2: number;
  isImage?: boolean;
  aspectRatio?: number;
};

/**
 * Enhanced laser cut preview with smart layout optimization
 * Supports SVG, DXF, PDF, and X-Tool files with automatic layout generation
 */
export default function LaserCutPreview({ file, unit = "mm", onSpecsDetected, onLayoutOptimized }: Props) {
  const [parsed, setParsed] = useState<ParsedSvg | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const [manualWidth, setManualWidth] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialSheet>(STANDARD_SHEETS[0]);
  const [selectedMachine, setSelectedMachine] = useState<LaserMachine>(SAMPLE_MACHINES[0]);
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showLayout, setShowLayout] = useState(false);
  const [showPathEditor, setShowPathEditor] = useState(false);
  const [spacing, setSpacing] = useState(5);
  const [autoRotate, setAutoRotate] = useState(true);
  const [currentPart, setCurrentPart] = useState<LaserPart | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const optimizer = useMemo(() => new LaserLayoutOptimizer(spacing), [spacing]);

  const autoOptimize = (part: LaserPart, qty: number, material: MaterialSheet) => {
    try {
      const p = { ...part, quantity: qty };
      const res = optimizer.optimizeLayout([p], material);
      setLayoutResult(res);
      onLayoutOptimized?.(res);
      
      const specs: SpecsDetected = {
        widthMm: part.widthMm,
        heightMm: part.heightMm,
        cutLengthMm: part.cutLengthMm,
        engraveAreaCm2: part.engraveAreaCm2,
        sheetsNeeded: res.totalSheets,
        sheetName: material.name,
        sheetPriceCents: material.priceCents
      };
      onSpecsDetected?.(specs);
      return res;
    } catch (e) {
      console.error("Auto-optimize failed", e);
      return null;
    }
  };

  useEffect(() => {
    if (parsed && currentPart) {
      autoOptimize(currentPart, quantity, selectedMaterial);
    }
  }, [quantity, selectedMaterial]);

  useEffect(() => {
    setParsed(null);
    setUnsupported(null);
    setManualWidth("");
    setLayoutResult(null);
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    
    // Handle X-Tool and other machine files
    if (['tool', 'nc', 'gcode', 'xtool'].includes(ext || '')) {
      handleToolFile(file);
      return;
    }
    
    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      handleImageFile(file);
      return;
    }

    if (ext !== "svg") {
      setUnsupported(ext?.toUpperCase() ?? "file");
      return;
    }

    handleSvgFile(file);
  }, [file]);

  const handleToolFile = async (file: File) => {
    setIsOptimizing(true);
    try {
      const parts = await LaserLayoutOptimizer.parseToolFile(file);
      if (parts.length > 0) {
        const part = parts[0];
        
        // Find best initial material sheet that fits
        const fittingSheet = STANDARD_SHEETS.find(s => 
          (s.widthMm >= part.widthMm && s.heightMm >= part.heightMm) ||
          (s.heightMm >= part.widthMm && s.widthMm >= part.heightMm)
        ) || STANDARD_SHEETS[0];
        
        setSelectedMaterial(fittingSheet);

        setParsed({
          raw: `Tool file: ${file.name}`,
          widthMm: part.widthMm,
          heightMm: part.heightMm,
          cutLengthMm: part.cutLengthMm,
          engraveAreaCm2: part.engraveAreaCm2,
          aspectRatio: part.widthMm / part.heightMm
        });
        
        setQuantity(part.quantity);
        setCurrentPart(part);
        autoOptimize(part, part.quantity, fittingSheet);
        toast.success(`Loaded ${parts.length} part(s) from ${file.name}`);
      }
    } catch (error) {
      console.error("Tool file parsing failed", error);
      toast.error("Could not parse tool file");
      setUnsupported(file.name.split('.').pop()?.toUpperCase() || "file");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const w = 100; // default 100mm
        const h = (img.height / img.width) * w;
        
        const part: LaserPart = {
          id: 'image-part',
          name: file.name,
          widthMm: w,
          heightMm: h,
          cutLengthMm: 0,
          engraveAreaCm2: (w * h) / 100,
          quantity: 1,
          rotation: 0
        };

        setParsed({
          raw: e.target?.result as string,
          widthMm: w,
          heightMm: h,
          cutLengthMm: 0,
          engraveAreaCm2: part.engraveAreaCm2,
          isImage: true,
          aspectRatio: img.width / img.height
        });

        setCurrentPart(part);
        autoOptimize(part, quantity, selectedMaterial);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSvgFile = (file: File) => {
    file.text().then((text) => {
      try {
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg) throw new Error("no svg element");

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.visibility = "hidden";
        container.style.width = "0";
        container.style.height = "0";
        container.style.overflow = "hidden";
        const clone = svg.cloneNode(true) as SVGSVGElement;
        container.appendChild(clone);
        document.body.appendChild(container);

        let widthMm = 0;
        let heightMm = 0;
        let totalCutLengthMm = 0;
        let totalEngraveAreaMm2 = 0;

        try {
          const bbox = (clone as any).getBBox();
          
          if (!svg.getAttribute("viewBox")) {
            svg.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
          }

          const parseAttrSize = (v: string | null): number => {
            if (!v) return 0;
            const n = parseFloat(v);
            if (v.endsWith("in")) return n * 25.4;
            if (v.endsWith("cm")) return n * 10;
            if (v.endsWith("mm")) return n;
            return (n / 96) * 25.4;
          };

          const viewboxAttr = (svg.getAttribute("viewBox") || "").split(/[,\s]+/);
          const vbW = parseFloat(viewboxAttr[2]) || 1;
          const vbH = parseFloat(viewboxAttr[3]) || 1;
          const attrW = parseAttrSize(svg.getAttribute("width"));
          
          const scale = attrW ? attrW / vbW : 25.4 / 96;

          widthMm = bbox.width * scale;
          heightMm = bbox.height * scale;

          const paths = clone.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse");
          paths.forEach((el: any) => {
            const stroke = (el.getAttribute("stroke") || "").toLowerCase();
            const fill = (el.getAttribute("fill") || "").toLowerCase();
            const isNone = (v: string) => !v || v === "none";

            let length = 0;
            if (el.getTotalLength) {
              length = el.getTotalLength();
            } else {
              const tag = el.tagName.toLowerCase();
              if (tag === "rect") {
                length = (parseFloat(el.getAttribute("width") || "0") + parseFloat(el.getAttribute("height") || "0")) * 2;
              } else if (tag === "circle") {
                length = 2 * Math.PI * parseFloat(el.getAttribute("r") || "0");
              }
            }

            const isRed = stroke.includes("red") || stroke.startsWith("#f00") || stroke.startsWith("#ff0000") || stroke.startsWith("rgb(255,0,0)");
            
            if (isRed && !isNone(stroke)) {
              totalCutLengthMm += length * scale;
            } else {
              const elBBox = el.getBBox();
              if (!isNone(fill) && fill !== "white" && fill !== "#fff" && fill !== "#ffffff") {
                totalEngraveAreaMm2 += elBBox.width * elBBox.height * scale * scale;
              } else if (!isNone(stroke)) {
                totalEngraveAreaMm2 += length * 0.5 * scale;
              }
            }
          });
        } finally {
          document.body.removeChild(container);
        }

        const finalW = widthMm || 100;
        const finalH = heightMm || 100;
        const finalCutLength = totalCutLengthMm;
        const finalEngraveArea = totalEngraveAreaMm2 / 100;
        
        // Parse paths for manual editing
        const paths = LaserLayoutOptimizer.parseSvgPaths(text);
        
        const part: LaserPart = {
          id: 'main-part',
          name: file?.name || 'Part',
          widthMm: finalW,
          heightMm: finalH,
          cutLengthMm: finalCutLength,
          engraveAreaCm2: finalEngraveArea,
          quantity: quantity,
          rotation: 0,
          paths: paths
        };

        setParsed({ 
          raw: text, 
          widthMm: finalW, 
          heightMm: finalH, 
          cutLengthMm: finalCutLength, 
          engraveAreaCm2: finalEngraveArea,
          aspectRatio: finalW / finalH
        });
        
        // Find best sheet for this part size
        const fittingSheet = STANDARD_SHEETS.find(s => 
          (s.widthMm >= finalW && s.heightMm >= finalH) ||
          (s.heightMm >= finalW && s.widthMm >= finalH)
        ) || STANDARD_SHEETS[0];
        
        setSelectedMaterial(fittingSheet);
        setCurrentPart(part);
        autoOptimize(part, quantity, fittingSheet);
      } catch (err) {
        console.error("SVG Analysis failed", err);
        setUnsupported("SVG");
      }
    });
  };

  const handleManualScale = (val: string) => {
    setManualWidth(val);
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0 || !parsed?.aspectRatio) return;
    
    const wMm = unit === "in" ? n * 25.4 : n;
    const originalWMm = parsed.widthMm || 1;
    const ratio = wMm / originalWMm;
    const hMm = wMm / parsed.aspectRatio;
    
    if (currentPart) {
      const updatedPart = {
        ...currentPart,
        widthMm: wMm,
        heightMm: hMm,
        cutLengthMm: currentPart.cutLengthMm * ratio,
        engraveAreaCm2: currentPart.engraveAreaCm2 * ratio * ratio
      };
      setCurrentPart(updatedPart);
      autoOptimize(updatedPart, quantity, selectedMaterial);
      
      setParsed(p => p ? { 
        ...p, 
        widthMm: wMm, 
        heightMm: hMm,
        cutLengthMm: updatedPart.cutLengthMm,
        engraveAreaCm2: updatedPart.engraveAreaCm2
      } : null);
    }
  };

  const optimizeLayout = async () => {
    if (!parsed || !currentPart) return;
    setIsOptimizing(true);
    autoOptimize(currentPart, quantity, selectedMaterial);
    setShowLayout(true);
    setIsOptimizing(false);
  };

  const updatePartOperation = (operationType: 'cut' | 'engrave' | 'both') => {
    if (!currentPart) return;
    const updatedPart = LaserLayoutOptimizer.updatePartOperation(currentPart, operationType);
    setCurrentPart(updatedPart);
    autoOptimize(updatedPart, quantity, selectedMaterial);
  };

  const updatePathOperation = (pathId: string, newType: 'cut' | 'engrave') => {
    if (!currentPart) return;
    const updatedPart = LaserLayoutOptimizer.updatePathOperation(currentPart, pathId, newType);
    setCurrentPart(updatedPart);
    autoOptimize(updatedPart, quantity, selectedMaterial);
  };

  const sizeLabel = useMemo(() => {
    if (!parsed) return "";
    return `${formatUnit(fromMm(parsed.widthMm, unit), unit)} × ${formatUnit(fromMm(parsed.heightMm, unit), unit)}`;
  }, [parsed, unit]);

  if (!file) {
    return (
      <div className="grid h-72 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Upload a file (SVG, DXF, PDF, TOOL, NC, XTOOL) to preview and optimize layout
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Section */}
      <div
        ref={wrapRef}
        className="relative grid min-h-[22rem] place-items-center overflow-hidden rounded-3xl border border-border bg-slate-900 shadow-inner p-8"
      >
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        
        {parsed ? (
          parsed.isImage ? (
            <img src={parsed.raw} className="relative z-10 max-h-[18rem] w-auto drop-shadow-2xl" alt="Preview" />
          ) : (
            <div
              className="relative z-10 max-h-[18rem] w-full max-w-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] [&_svg]:h-auto [&_svg]:max-h-[18rem] [&_svg]:w-auto [&_svg]:max-w-full [&_svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: parsed.raw.replace(/<script[\s\S]*?<\/script>/gi, "") }}
            />
          )
        ) : unsupported ? (
          <div className="flex flex-col items-center gap-4 text-center text-sm text-slate-400">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-white uppercase tracking-tight">{unsupported} ready for quote</div>
              <p className="max-w-[240px] text-xs leading-relaxed">
                In-browser preview is limited for this format, but your file will be processed accurately by the maker.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-500 text-sm font-medium animate-pulse">
            <Scan className="h-4 w-4" /> Analyzing file content…
          </div>
        )}

        {/* Dynamic Scale Indicator */}
        {parsed && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
            <div className="h-[1px] flex-1 bg-white/20" />
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{sizeLabel}</div>
            <div className="h-[1px] flex-1 bg-white/20" />
          </div>
        )}
      </div>

      {/* Stats Section */}
      {parsed && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Ruler className="h-3.5 w-3.5" />} label="Actual Size" value={sizeLabel} />
          <Stat icon={<Scan className="h-3.5 w-3.5" />} label="Cut Length" value={`${Math.round(parsed.cutLengthMm)}mm`} />
          <Stat icon={<Layers className="h-3.5 w-3.5" />} label="Engrave Area" value={`${parsed.engraveAreaCm2.toFixed(1)}cm²`} />
          <Stat icon={<Package className="h-3.5 w-3.5" />} label="Quantity" value={`${quantity}x`} />
        </div>
      )}

      {/* Smart Layout Controls */}
      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Smart Layout Optimization
            </CardTitle>
            <CardDescription>
              Automatically arrange parts for maximum material utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label className="text-xs font-medium">Material Sheet</Label>
                <Select value={selectedMaterial.name} onValueChange={(value) => {
                  const material = STANDARD_SHEETS.find(s => s.name === value);
                  if (material) setSelectedMaterial(material);
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_SHEETS.map((sheet) => (
                      <SelectItem key={sheet.name} value={sheet.name}>
                        {sheet.name} (${(sheet.priceCents / 100).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs font-medium">Laser Machine</Label>
                <Select value={selectedMachine.id} onValueChange={(value) => {
                  const machine = SAMPLE_MACHINES.find(m => m.id === value);
                  if (machine) setSelectedMachine(machine);
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLE_MACHINES.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.brand} {machine.model} ({machine.power}W)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs font-medium">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs font-medium">Part Spacing (mm)</Label>
                <Slider
                  value={[spacing]}
                  onValueChange={([v]) => setSpacing(v)}
                  min={2}
                  max={10}
                  step={1}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">{spacing}mm</div>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={optimizeLayout} 
                  disabled={isOptimizing}
                  className="w-full"
                >
                  {isOptimizing ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-pulse" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Optimize Layout
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Path Editing Controls */}
            {currentPart && currentPart.paths && currentPart.paths.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Cut/Engrave Operations</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPathEditor(!showPathEditor)}
                  >
                    {showPathEditor ? "Hide" : "Show"} Path Editor
                  </Button>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={currentPart.operationType === 'cut' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updatePartOperation('cut')}
                  >
                    All Cut
                  </Button>
                  <Button
                    variant={currentPart.operationType === 'engrave' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updatePartOperation('engrave')}
                  >
                    All Engrave
                  </Button>
                  <Button
                    variant={currentPart.operationType === 'both' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updatePartOperation('both')}
                  >
                    Auto Detect
                  </Button>
                </div>

                {showPathEditor && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {currentPart.paths.map((path, index) => (
                      <div key={path.id} className="flex items-center justify-between p-2 border border-border rounded-lg">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-3 h-3 rounded-full ${
                              path.type === 'cut' ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                          />
                          <span className="text-sm">Path {index + 1}</span>
                          <span className="text-xs text-muted-foreground">
                            ({path.type === 'cut' ? `${path.lengthMm.toFixed(0)}mm` : `${path.areaCm2?.toFixed(1)}cm²`})
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePathOperation(path.id, path.type === 'cut' ? 'engrave' : 'cut')}
                        >
                          {path.type === 'cut' ? 'Engrave' : 'Cut'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Layout Results */}
            {layoutResult && showLayout && (
              <div className="mt-6">
                <LayoutVisualization layout={layoutResult} unit={unit} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Scale Control */}
      {parsed && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Scale target width ({unit})</Label>
            <Maximize className="h-3 w-3 text-muted-foreground" />
          </div>
          <Input
            type="number"
            placeholder="Resize..."
            value={manualWidth}
            onChange={(e) => handleManualScale(e.target.value)}
            className="mt-1 bg-background/50 border-border/20"
          />
        </div>
      )}

      {/* Laser Intelligence Info */}
      {!parsed?.isImage && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
          <div className="flex shrink-0 gap-1.5">
            <div className="h-2 w-3 rounded-sm bg-red-500" />
            <div className="h-2 w-3 rounded-sm bg-slate-300" />
          </div>
          <p>
            <span className="font-semibold text-foreground">Laser intelligence:</span> We detected <span className="text-foreground font-medium">{Math.round(parsed?.cutLengthMm || 0)}mm</span> of cutting paths. Red strokes are through-cuts, all other colors are engraved.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
