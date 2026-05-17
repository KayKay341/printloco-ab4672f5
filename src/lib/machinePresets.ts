export const MACHINE_PRESETS: Record<string, Record<string, string[]>> = {
  "3d-print": {
    "Bambu Lab": ["X1 Carbon", "P1P", "P1S", "A1", "A1 Mini"],
    "Prusa": ["MK4", "MK3S+", "Mini+", "XL"],
    "Creality": ["Ender 3 V3", "K1", "K1 Max", "CR-10"],
    "Other": ["Custom FDM", "Resin (SLA)"],
  },
  "laser-cut": {
    "xTool": ["S1", "P2", "M1"],
    "Glowforge": ["Pro", "Plus", "Basic"],
    "Omtech": ["60W", "80W"],
    "Other": ["Custom CO2", "Diode Laser"],
  },
  "embroidery": {
    "Brother": ["PR1055X", "Persona PRS100", "SE1900"],
    "Tajima": ["Sai", "TMBR-SC"],
    "Other": ["Home Multi-needle", "Single Needle"],
  },
  "vinyl": {
    "Cricut": ["Maker 3", "Explore 3", "Joy"],
    "Roland": ["GS-24", "CAMM-1"],
    "Other": ["Silhouette", "Vinyl Plotter"],
  },
};
