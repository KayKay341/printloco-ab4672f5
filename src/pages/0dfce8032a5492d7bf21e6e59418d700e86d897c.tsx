import { useMemo } from "react";
import { type Unit, fromMm, formatUnit } from "@/lib/units";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { type LayoutResult } from "@/lib/laserLayout";

type Props = {
  layout: LayoutResult | null;
  unit?: Unit;
};

/**
 * Visual representation of the optimized laser cut layout
 * Shows sheets, parts placement, and utilization statistics
 */
export default function LayoutVisualization({ layout, unit = "mm" }: Props) {
  if (!layout) {
    return (
      <div className="grid h-48 place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
        Optimize layout to see visualization
      </div>
    );
  }

  const scale = useMemo(() => {
    // Calculate scale to fit the largest sheet in the available space
    const maxSheetWidth = Math.max(...layout.sheets.map(s => s.sheet.widthMm));
    const maxSheetHeight = Math.max(...layout.sheets.map(s => s.sheet.heightMm));
    const maxDisplayWidth = 600; // max display width in pixels
    const maxDisplayHeight = 400; // max display height in pixels
    
    return Math.min(maxDisplayWidth / maxSheetWidth, maxDisplayHeight / maxSheetHeight, 0.5);
  }, [layout]);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Layout Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{layout.totalSheets}</div>
              <div className="text-sm text-muted-foreground">Sheets Required</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{layout.utilization.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Material Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">${(layout.estimatedCost / 100).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Estimated Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{layout.layoutTime}ms</div>
              <div className="text-sm text-muted-foreground">Optimization Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sheet Layouts */}
      <div className="space-y-6">
        {layout.sheets.map((sheet, sheetIndex) => (
          <Card key={sheetIndex}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sheet {sheetIndex + 1}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">{sheet.sheet.name}</Badge>
                  <Badge variant="outline">{sheet.utilization.toFixed(1)}% used</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sheet Info */}
                <div className="text-sm text-muted-foreground">
                  Sheet size: {formatUnit(fromMm(sheet.sheet.widthMm, unit), unit)} × {formatUnit(fromMm(sheet.sheet.heightMm, unit), unit)}
                  {" • "}
                  Parts: {sheet.parts.length}
                  {" • "}
                  Waste: {formatUnit(fromMm(Math.sqrt(sheet.wasteArea), unit), unit)}²
                </div>

                {/* Visual Layout */}
                <div className="overflow-auto border border-border rounded-lg bg-slate-900 p-4">
                  <div 
                    className="relative bg-white/5 border border-white/10"
                    style={{
                      width: `${sheet.sheet.widthMm * scale}px`,
                      height: `${sheet.sheet.heightMm * scale}px`,
                      minWidth: '200px',
                      minHeight: '150px'
                    }}
                  >
                    {/* Grid background */}
                    <div 
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `linear-gradient(0deg, #fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                        backgroundSize: `${20 * scale}px ${20 * scale}px`
                      }}
                    />

                    {/* Parts */}
                    {sheet.parts.map((part, partIndex) => {
                      const partWidth = part.part.rotation % 180 === 0 ? part.part.widthMm : part.part.heightMm;
                      const partHeight = part.part.rotation % 180 === 0 ? part.part.heightMm : part.part.widthMm;
                      
                      return (
                        <div
                          key={partIndex}
                          className="absolute border border-primary bg-primary/20 flex items-center justify-center text-xs font-medium text-primary"
                          style={{
                            left: `${part.x * scale}px`,
                            top: `${part.y * scale}px`,
                            width: `${partWidth * scale}px`,
                            height: `${partHeight * scale}px`,
                            minWidth: '20px',
                            minHeight: '15px',
                            transform: `rotate(${part.rotation}deg)`,
                            transformOrigin: 'center'
                          }}
                          title={`${part.part.name} (${formatUnit(fromMm(partWidth, unit), unit)} × ${formatUnit(fromMm(partHeight, unit), unit)})`}
                        >
                          <span className="truncate px-1">
                            {part.part.name.substring(0, 3)}
                          </span>
                        </div>
                      );
                    })}

                    {/* Sheet dimensions label */}
                    <div className="absolute bottom-2 right-2 text-xs text-white/60 font-mono bg-black/50 px-1 rounded">
                      {formatUnit(fromMm(sheet.sheet.widthMm, unit), unit)} × {formatUnit(fromMm(sheet.sheet.heightMm, unit), unit)}
                    </div>
                  </div>
                </div>

                {/* Parts List */}
                {sheet.parts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Parts on this sheet:</h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {sheet.parts.map((part, partIndex) => {
                        const partWidth = part.part.rotation % 180 === 0 ? part.part.widthMm : part.part.heightMm;
                        const partHeight = part.part.rotation % 180 === 0 ? part.part.heightMm : part.part.widthMm;
                        
                        return (
                          <div key={partIndex} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2 text-xs">
                            <div>
                              <div className="font-medium">{part.part.name}</div>
                              <div className="text-muted-foreground">
                                {formatUnit(fromMm(partWidth, unit), unit)} × {formatUnit(fromMm(partHeight, unit), unit)}
                                {part.rotation !== 0 && ` • ${part.rotation}°`}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {part.part.quantity}x
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
