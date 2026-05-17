/**
 * Smart layout and optimization system for laser cutting
 * Similar to the 3D printing slicer but optimized for flat parts
 */

export interface LaserPart {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  cutLengthMm: number;
  engraveAreaCm2: number;
  quantity: number;
  rotation: number; // 0, 90, 180, 270 degrees
  x?: number; // position on sheet
  y?: number; // position on sheet
  isRed?: boolean; // for cut detection
  operationType?: 'cut' | 'engrave' | 'both'; // manual override
  paths?: LaserPath[]; // individual paths for fine control
}

export interface LaserPath {
  id: string;
  type: 'cut' | 'engrave';
  color: string;
  lengthMm: number;
  areaCm2?: number; // for engrave fills
  points?: number[][]; // path coordinates
}

export interface MaterialSheet {
  widthMm: number;
  heightMm: number;
  name: string;
  thicknessMm: number;
  priceCents: number;
  machine?: LaserMachine;
}

export interface LaserMachine {
  id: string;
  brand: string;
  model: string;
  power: number; // watts
  bedWidthMm: number;
  bedHeightMm: number;
  maxSpeed: number; // mm/min
  supportedMaterials: string[];
  pricePerSheet: number;
  setupTime: number; // minutes
}

export interface LayoutResult {
  sheets: SheetLayout[];
  totalSheets: number;
  utilization: number;
  wasteArea: number;
  estimatedCost: number;
  layoutTime: number;
}

export interface SheetLayout {
  sheet: MaterialSheet;
  parts: PlacedPart[];
  utilization: number;
  wasteArea: number;
}

export interface PlacedPart {
  part: LaserPart;
  x: number;
  y: number;
  rotation: number;
  sheetIndex: number;
}

// Sample laser machines
export const SAMPLE_MACHINES: LaserMachine[] = [
  {
    id: "glowforge-pro",
    brand: "Glowforge",
    model: "Pro",
    power: 45,
    bedWidthMm: 518,
    bedHeightMm: 305,
    maxSpeed: 850,
    supportedMaterials: ["Plywood", "Acrylic", "Leather", "Paper"],
    pricePerSheet: 2.50,
    setupTime: 5
  },
  {
    id: "epilog-zing",
    brand: "Epilog",
    model: "Zing 24",
    power: 40,
    bedWidthMm: 610,
    bedHeightMm: 305,
    maxSpeed: 1000,
    supportedMaterials: ["Plywood", "Acrylic", "MDF", "Leather"],
    pricePerSheet: 3.00,
    setupTime: 8
  },
  {
    id: "trotec-speedy",
    brand: "Trotec",
    model: "Speedy 100",
    power: 80,
    bedWidthMm: 1000,
    bedHeightMm: 610,
    maxSpeed: 1500,
    supportedMaterials: ["Plywood", "Acrylic", "MDF", "Leather", "Metal"],
    pricePerSheet: 4.00,
    setupTime: 10
  }
];

// Standard material sheets (common laser cutter sizes)
export const STANDARD_SHEETS: MaterialSheet[] = [
  { widthMm: 600, heightMm: 300, name: "Plywood 3mm", thicknessMm: 3, priceCents: 350, machine: SAMPLE_MACHINES[0] },
  { widthMm: 600, heightMm: 300, name: "Plywood 6mm", thicknessMm: 6, priceCents: 450, machine: SAMPLE_MACHINES[0] },
  { widthMm: 600, heightMm: 300, name: "Acrylic 3mm", thicknessMm: 3, priceCents: 550, machine: SAMPLE_MACHINES[1] },
  { widthMm: 600, heightMm: 300, name: "Acrylic 6mm", thicknessMm: 6, priceCents: 750, machine: SAMPLE_MACHINES[1] },
  { widthMm: 1220, heightMm: 610, name: "Plywood 3mm (Full)", thicknessMm: 3, priceCents: 1200, machine: SAMPLE_MACHINES[2] },
  { widthMm: 1220, heightMm: 610, name: "Acrylic 3mm (Full)", thicknessMm: 3, priceCents: 1800, machine: SAMPLE_MACHINES[2] },
];

export class LaserLayoutOptimizer {
  private spacing = 5; // 5mm spacing between parts
  private kerf = 0.2; // 0.2mm kerf compensation

  constructor(spacingMm: number = 5, kerfMm: number = 0.2) {
    this.spacing = spacingMm;
    this.kerf = kerfMm;
  }

  /**
   * Main layout optimization function
   */
  optimizeLayout(parts: LaserPart[], material: MaterialSheet): LayoutResult {
    const startTime = Date.now();
    
    // Sort parts by area (largest first) for better packing
    const sortedParts = [...parts].sort((a, b) => 
      (b.widthMm * b.heightMm) - (a.widthMm * a.heightMm)
    );

    const sheets: SheetLayout[] = [];
    let remainingParts = sortedParts.map(p => ({ ...p, quantity: p.quantity }));
    let sheetIndex = 0;

    while (remainingParts.some(p => p.quantity > 0)) {
      const sheetLayout = this.layoutSheet(remainingParts, material, sheetIndex);
      if (sheetLayout.parts.length === 0) break; // Can't fit any more parts
      
      sheets.push(sheetLayout);
      
      // Remove placed parts from remaining list
      sheetLayout.parts.forEach(placed => {
        const part = remainingParts.find(p => p.id === placed.part.id);
        if (part) part.quantity--;
      });
      
      remainingParts = remainingParts.filter(p => p.quantity > 0);
      sheetIndex++;
    }

    const totalArea = sheets.reduce((sum, s) => sum + (s.sheet.widthMm * s.sheet.heightMm), 0);
    const usedArea = sheets.reduce((sum, s) => 
      sum + s.parts.reduce((partSum, p) => 
        partSum + (p.part.widthMm * p.part.heightMm), 0
      ), 0
    );
    
    const utilization = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
    const wasteArea = totalArea - usedArea;
    const estimatedCost = sheets.length * material.priceCents;
    const layoutTime = Date.now() - startTime;

    return {
      sheets,
      totalSheets: sheets.length,
      utilization,
      wasteArea,
      estimatedCost,
      layoutTime
    };
  }

  /**
   * Layout parts on a single sheet using bin packing algorithm
   */
  private layoutSheet(parts: LaserPart[], sheet: MaterialSheet, sheetIndex: number): SheetLayout {
    const placedParts: PlacedPart[] = [];
    const usedSpaces: { x: number; y: number; width: number; height: number }[] = [];

    // Try to place each part
    for (const part of parts) {
      if (part.quantity <= 0) continue;

      let bestPosition: { x: number; y: number; rotation: number } | null = null;
      let minWaste = Infinity;

      // Try all 4 rotations
      for (const rotation of [0, 90, 180, 270]) {
        const rotatedWidth = rotation % 180 === 0 ? part.widthMm : part.heightMm;
        const rotatedHeight = rotation % 180 === 0 ? part.heightMm : part.widthMm;

        // Try to find the best position (bottom-left heuristic)
        for (let y = 0; y <= sheet.heightMm - rotatedHeight; y += 5) {
          for (let x = 0; x <= sheet.widthMm - rotatedWidth; x += 5) {
            if (this.canPlacePart(x, y, rotatedWidth, rotatedHeight, usedSpaces)) {
              // Calculate waste (distance from origin + empty space around)
              const waste = x + y + this.calculateSurroundingWaste(x, y, rotatedWidth, rotatedHeight, sheet, usedSpaces);
              
              if (waste < minWaste) {
                minWaste = waste;
                bestPosition = { x, y, rotation };
              }
            }
          }
        }
      }

      if (bestPosition) {
        const rotatedWidth = bestPosition.rotation % 180 === 0 ? part.widthMm : part.heightMm;
        const rotatedHeight = bestPosition.rotation % 180 === 0 ? part.heightMm : part.widthMm;

        placedParts.push({
          part: { ...part, rotation: bestPosition.rotation },
          x: bestPosition.x,
          y: bestPosition.y,
          rotation: bestPosition.rotation,
          sheetIndex
        });

        usedSpaces.push({
          x: bestPosition.x - this.spacing,
          y: bestPosition.y - this.spacing,
          width: rotatedWidth + (this.spacing * 2),
          height: rotatedHeight + (this.spacing * 2)
        });

        break; // Place one instance of this part
      }
    }

    const sheetArea = sheet.widthMm * sheet.heightMm;
    const usedArea = placedParts.reduce((sum, p) => {
      const w = p.part.rotation % 180 === 0 ? p.part.widthMm : p.part.heightMm;
      const h = p.part.rotation % 180 === 0 ? p.part.heightMm : p.part.widthMm;
      return sum + (w * h);
    }, 0);

    return {
      sheet,
      parts: placedParts,
      utilization: sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0,
      wasteArea: sheetArea - usedArea
    };
  }

  /**
   * Check if a part can be placed at the given position
   */
  private canPlacePart(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    usedSpaces: { x: number; y: number; width: number; height: number }[]
  ): boolean {
    return !usedSpaces.some(space => 
      x < space.x + space.width &&
      x + width > space.x &&
      y < space.y + space.height &&
      y + height > space.y
    );
  }

  /**
   * Calculate surrounding waste area for positioning heuristic
   */
  private calculateSurroundingWaste(
    x: number,
    y: number,
    width: number,
    height: number,
    sheet: MaterialSheet,
    usedSpaces: { x: number; y: number; width: number; height: number }[]
  ): number {
    // Simple heuristic: prefer positions closer to origin and edges
    const edgeDistance = Math.min(x, y, sheet.widthMm - x - width, sheet.heightMm - y - height);
    return edgeDistance * 0.1; // Small weight for edge preference
  }

  /**
   * Parse X-Tool files (common laser cutter file formats)
   */
  static async parseToolFile(file: File): Promise<LaserPart[]> {
    const text = await file.text();
    const ext = file.name.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'tool':
      case 'xtool':
        return this.parseXTool(text);
      case 'nc':
      case 'gcode':
        return this.parseGCode(text);
      case 'dxf':
        return this.parseDXF(text);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Parse X-Tool format (simplified)
   */
  private static parseXTool(text: string): LaserPart[] {
    const parts: LaserPart[] = [];
    const lines = text.split('\n');
    
    let currentPart: Partial<LaserPart> | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('PART')) {
        if (currentPart) {
          parts.push(this.finalizePart(currentPart));
        }
        currentPart = {
          id: `part-${parts.length}`,
          name: trimmed.replace('PART', '').trim(),
          quantity: 1,
          rotation: 0
        };
      } else if (trimmed.startsWith('SIZE') && currentPart) {
        const match = trimmed.match(/SIZE\s+([\d.]+)\s*x\s*([\d.]+)/);
        if (match) {
          currentPart.widthMm = parseFloat(match[1]);
          currentPart.heightMm = parseFloat(match[2]);
        }
      } else if (trimmed.startsWith('CUT') && currentPart) {
        const match = trimmed.match(/CUT\s+([\d.]+)/);
        if (match) {
          currentPart.cutLengthMm = parseFloat(match[1]);
        }
      } else if (trimmed.startsWith('ENGRAVE') && currentPart) {
        const match = trimmed.match(/ENGRAVE\s+([\d.]+)/);
        if (match) {
          currentPart.engraveAreaCm2 = parseFloat(match[1]);
        }
      } else if (trimmed.startsWith('QTY') && currentPart) {
        const match = trimmed.match(/QTY\s+(\d+)/);
        if (match) {
          currentPart.quantity = parseInt(match[1]);
        }
      }
    }
    
    if (currentPart) {
      parts.push(this.finalizePart(currentPart));
    }
    
    return parts;
  }

  /**
   * Parse G-code for laser cutting (simplified)
   */
  private static parseGCode(text: string): LaserPart[] {
    // This is a simplified parser - real implementation would need full G-code interpreter
    const part: LaserPart = {
      id: 'gcode-part',
      name: 'G-code Part',
      widthMm: 100, // Default - would need to analyze movements
      heightMm: 100,
      cutLengthMm: 0,
      engraveAreaCm2: 0,
      quantity: 1,
      rotation: 0
    };

    // Extract dimensions from G-code movements
    const xMoves = text.match(/X([-\d.]+)/g) || [];
    const yMoves = text.match(/Y([-\d.]+)/g) || [];
    
    if (xMoves.length > 0) {
      const xValues = xMoves.map(m => parseFloat(m.substring(1)));
      part.widthMm = Math.max(...xValues) - Math.min(...xValues);
    }
    
    if (yMoves.length > 0) {
      const yValues = yMoves.map(m => parseFloat(m.substring(1)));
      part.heightMm = Math.max(...yValues) - Math.min(...yValues);
    }

    // Estimate cut length from movement commands
    const moveCommands = text.match(/G01.*?F\d+/g) || [];
    part.cutLengthMm = moveCommands.length * 10; // Rough estimate

    return [part];
  }

  /**
   * Parse DXF files (simplified)
   */
  private static parseDXF(text: string): LaserPart[] {
    // Simplified DXF parser - real implementation would need full DXF interpreter
    const part: LaserPart = {
      id: 'dxf-part',
      name: 'DXF Part',
      widthMm: 100,
      heightMm: 100,
      cutLengthMm: 0,
      engraveAreaCm2: 0,
      quantity: 1,
      rotation: 0
    };

    // Extract extents from DXF
    const extentsMatch = text.match(/\$EXTMIN\s+([\d.]+)\s+([\d.]+).*?\$EXTMAX\s+([\d.]+)\s+([\d.]+)/s);
    if (extentsMatch) {
      part.widthMm = parseFloat(extentsMatch[3]) - parseFloat(extentsMatch[1]);
      part.heightMm = parseFloat(extentsMatch[4]) - parseFloat(extentsMatch[2]);
    }

    return [part];
  }

  /**
   * Finalize a part with default values
   */
  private static finalizePart(part: Partial<LaserPart>): LaserPart {
    return {
      id: part.id || 'unknown',
      name: part.name || 'Unknown Part',
      widthMm: part.widthMm || 0,
      heightMm: part.heightMm || 0,
      cutLengthMm: part.cutLengthMm || 0,
      engraveAreaCm2: part.engraveAreaCm2 || 0,
      quantity: part.quantity || 1,
      rotation: part.rotation || 0
    };
  }

  /**
   * Parse SVG paths and identify cut vs engrave operations
   */
  static parseSvgPaths(svgText: string): LaserPath[] {
    const paths: LaserPath[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svg = doc.querySelector("svg");
    
    if (!svg) return paths;

    const elements = svg.querySelectorAll("path, line, polyline, polygon, rect, circle, ellipse");
    
    elements.forEach((el, index) => {
      const stroke = (el.getAttribute("stroke") || "").toLowerCase();
      const fill = (el.getAttribute("fill") || "").toLowerCase();
      const isNone = (v: string) => !v || v === "none";
      
      let length = 0;
      if ((el as any).getTotalLength) {
        length = (el as any).getTotalLength();
      } else {
        // Basic perimeter fallback
        const tag = el.tagName.toLowerCase();
        if (tag === "rect") {
          const width = parseFloat(el.getAttribute("width") || "0");
          const height = parseFloat(el.getAttribute("height") || "0");
          length = (width + height) * 2;
        } else if (tag === "circle") {
          const r = parseFloat(el.getAttribute("r") || "0");
          length = 2 * Math.PI * r;
        }
      }

      const isRed = stroke.includes("red") || stroke.startsWith("#f00") || stroke.startsWith("#ff0000") || stroke.startsWith("rgb(255,0,0)");
      const isFilled = !isNone(fill) && fill !== "white" && fill !== "#fff" && fill !== "#ffffff";
      
      let type: 'cut' | 'engrave' = isRed && !isNone(stroke) ? 'cut' : 'engrave';
      
      const bbox = (el as any).getBBox();
      const area = isFilled ? bbox.width * bbox.height / 100 : 0; // Convert to cm²
      
      paths.push({
        id: `path-${index}`,
        type,
        color: isRed ? 'red' : stroke || fill || 'black',
        lengthMm: length,
        areaCm2: area
      });
    });

    return paths;
  }

  /**
   * Update part operation type manually
   */
  static updatePartOperation(part: LaserPart, operationType: 'cut' | 'engrave' | 'both'): LaserPart {
    const updatedPart = { ...part, operationType };
    
    if (part.paths) {
      updatedPart.paths = part.paths.map(path => ({
        ...path,
        type: operationType === 'both' ? path.type : operationType
      }));
    }
    
    // Recalculate cut length and engrave area based on new operation type
    if (part.paths) {
      const cutPaths = part.paths.filter(p => p.type === 'cut');
      const engravePaths = part.paths.filter(p => p.type === 'engrave');
      
      updatedPart.cutLengthMm = cutPaths.reduce((sum, p) => sum + p.lengthMm, 0);
      updatedPart.engraveAreaCm2 = engravePaths.reduce((sum, p) => sum + (p.areaCm2 || 0), 0);
    }
    
    return updatedPart;
  }

  /**
   * Update individual path operation type
   */
  static updatePathOperation(part: LaserPart, pathId: string, newType: 'cut' | 'engrave'): LaserPart {
    if (!part.paths) return part;
    
    const updatedPaths = part.paths.map(path => 
      path.id === pathId ? { ...path, type: newType } : path
    );
    
    const updatedPart = { ...part, paths: updatedPaths };
    
    // Recalculate totals
    const cutPaths = updatedPaths.filter(p => p.type === 'cut');
    const engravePaths = updatedPaths.filter(p => p.type === 'engrave');
    
    updatedPart.cutLengthMm = cutPaths.reduce((sum, p) => sum + p.lengthMm, 0);
    updatedPart.engraveAreaCm2 = engravePaths.reduce((sum, p) => sum + (p.areaCm2 || 0), 0);
    
    return updatedPart;
  }

  /**
   * Generate layout preview data for visualization
   */
  static generateLayoutPreview(layout: LayoutResult): any {
    return layout.sheets.map((sheet, index) => ({
      sheetIndex: index,
      width: sheet.sheet.widthMm,
      height: sheet.sheet.heightMm,
      parts: sheet.parts.map(p => ({
        id: p.part.id,
        name: p.part.name,
        x: p.x,
        y: p.y,
        width: p.part.rotation % 180 === 0 ? p.part.widthMm : p.part.heightMm,
        height: p.part.rotation % 180 === 0 ? p.part.heightMm : p.part.widthMm,
        rotation: p.rotation,
        quantity: p.part.quantity,
        operationType: p.part.operationType,
        paths: p.part.paths
      })),
      utilization: sheet.utilization,
      wasteArea: sheet.wasteArea,
      machine: sheet.sheet.machine
    }));
  }
}
