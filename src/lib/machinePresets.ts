export const MACHINE_PRESETS: Record<string, Record<string, string[]>> = {
  "3d-print": {
    "Bambu Lab": ["X1 Carbon", "P1S", "P1P", "A1", "A1 Mini"],
    "Prusa": ["MK4", "MK3S+", "Mini+", "XL", "i3 MK3"],
    "Creality": ["Ender 3 V3", "Ender 3 V2", "K1", "K1 Max", "CR-10", "CR-6 SE"],
    "Voron": ["Voron 2.4", "Voron Trident", "Voron V0.2"],
    "Flashforge": ["Adventurer 5M", "Guider 3", "Creator 3"],
    "Anycubic": ["Kobra 3", "Photon M5s", "Kobra Max"],
    "Elegoo": ["Neptune 4 Pro", "Saturn 3 Ultra", "Mars 4"],
    "Other": ["Custom FDM", "Resin (SLA)", "Other"],
  },
  "laser-cut": {
    "xTool": ["S1", "P2", "M1", "D1 Pro"],
    "Glowforge": ["Pro", "Plus", "Basic", "Aura"],
    "Omtech": ["60W", "80W", "100W", "40W"],
    "Epilog": ["Fusion Pro", "Zing"],
    "Boss Laser": ["LS-1630", "HP-2436"],
    "Other": ["Custom CO2", "Diode Laser"],
  },
  "embroidery": {
    "Brother": ["PR1055X", "Persona PRS100", "SE1900", "PE800", "Entrepreneur W"],
    "Tajima": ["Sai", "TMBR-SC", "TLMX"],
    "Janome": ["MB-7", "MC550E"],
    "Bernina": ["E 16", "590 E"],
    "Other": ["Home Multi-needle", "Single Needle"],
  },
  "vinyl": {
    "Cricut": ["Maker 3", "Explore 3", "Joy", "Venture"],
    "Roland": ["GS-24", "CAMM-1", "BN-20"],
    "Silhouette": ["Cameo 5", "Portrait 4", "Curio 2"],
    "Graphtec": ["CE7000"],
    "Other": ["Vinyl Plotter"],
  },
};
