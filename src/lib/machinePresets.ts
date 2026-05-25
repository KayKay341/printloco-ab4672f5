// Comprehensive machine catalog — popular current models plus older / legacy
// units that makers in the wild still actively run. "Other" always allows free entry.
export const MACHINE_PRESETS: Record<string, Record<string, string[]>> = {
  "3d-print": {
    "Bambu Lab": [
      "X1 Carbon", "X1E", "X1", "P1S", "P1P",
      "A1", "A1 Mini", "H2D",
    ],
    "Prusa": [
      "MK4S", "MK4", "MK3S+", "MK3S", "MK3", "MK2S", "MK2",
      "Mini+", "Mini", "XL", "CORE One", "i3 MK3", "i3 MK2",
      "SL1S Speed", "SL1",
    ],
    "Creality": [
      "K2 Plus", "K1 Max", "K1C", "K1",
      "Ender 3", "Ender 3 Pro", "Ender 3 V2", "Ender 3 V2 Neo",
      "Ender 3 S1", "Ender 3 S1 Pro", "Ender 3 V3 SE", "Ender 3 V3 KE", "Ender 3 V3",
      "Ender 5", "Ender 5 Pro", "Ender 5 Plus", "Ender 5 S1",
      "Ender 6", "Ender 7", "Ender 2", "Ender 2 Pro",
      "CR-10", "CR-10S", "CR-10 V2", "CR-10 V3", "CR-10 Smart", "CR-10 Smart Pro", "CR-10 Max",
      "CR-6 SE", "CR-30 (Belt)", "Sermoon V1", "Sermoon D1",
      "LD-002R", "Halot-One", "Halot-Mage",
    ],
    "Anycubic": [
      "Kobra 3", "Kobra 2", "Kobra 2 Pro", "Kobra 2 Plus", "Kobra 2 Max", "Kobra 2 Neo",
      "Kobra", "Kobra Plus", "Kobra Max", "Kobra Go",
      "Vyper", "Chiron", "Mega X", "Mega S", "Mega Zero", "i3 Mega",
      "Photon Mono M5s", "Photon Mono M5", "Photon Mono X 6Ks", "Photon Mono X 6K",
      "Photon Mono X", "Photon Mono", "Photon", "Photon S", "Photon Zero",
    ],
    "Elegoo": [
      "Centauri Carbon",
      "Neptune 4", "Neptune 4 Pro", "Neptune 4 Plus", "Neptune 4 Max",
      "Neptune 3", "Neptune 3 Pro", "Neptune 3 Plus", "Neptune 3 Max",
      "Neptune 2", "Neptune 2S", "Neptune X",
      "Mars 5 Ultra", "Mars 4 Ultra", "Mars 4 Max", "Mars 4 DLP", "Mars 3 Pro", "Mars 3", "Mars 2 Pro", "Mars 2", "Mars Pro", "Mars",
      "Saturn 4 Ultra", "Saturn 3 Ultra", "Saturn 3", "Saturn 2", "Saturn S", "Saturn",
    ],
    "Voron": [
      "Voron 2.4", "Voron Trident", "Voron V0.2", "Voron V0.1", "Voron Switchwire", "Voron Legacy",
    ],
    "Flashforge": [
      "Adventurer 5M Pro", "Adventurer 5M", "Adventurer 4", "Adventurer 3", "Adventurer 3 Lite",
      "AD5X", "Guider 3", "Guider 3 Plus", "Guider 2S", "Guider 2",
      "Creator 3 Pro", "Creator 3", "Creator Pro 2", "Creator Pro", "Creator Max",
      "Finder", "Finder 3", "Dreamer", "Inventor",
    ],
    "Formlabs": [
      "Form 4", "Form 4B", "Form 3+", "Form 3", "Form 3B", "Form 3L", "Form 2", "Form 1+",
      "Fuse 1+ 30W", "Fuse 1",
    ],
    "Ultimaker": [
      "S7", "S5", "S5 Pro Bundle", "S3", "S2+",
      "3", "3 Extended", "2+", "2+ Connect", "2", "2 Extended", "Original",
    ],
    "MakerBot": [
      "Method", "Method X", "Method XL", "Replicator+", "Replicator Mini+", "Replicator Z18",
      "Replicator 5th Gen", "Replicator 2", "Replicator 2X", "Replicator (Original)", "Sketch",
    ],
    "Qidi Tech": [
      "Q1 Pro", "X-Max 3", "X-Plus 3", "X-Smart 3", "i-Fast", "X-Pro", "X-Plus", "X-Max", "X-One 2",
    ],
    "Snapmaker": [
      "Artisan", "J1s", "J1", "2.0 A350T", "2.0 A250T", "2.0 A150", "Original",
    ],
    "Raise3D": [
      "Pro3", "Pro3 Plus", "Pro2", "Pro2 Plus", "E2", "E2CF", "N2", "N2 Plus",
    ],
    "LulzBot": [
      "TAZ Pro", "TAZ Workhorse", "TAZ 6", "TAZ 5", "Mini 2", "Mini", "Sidekick 289", "Sidekick 747",
    ],
    "Phrozen": [
      "Sonic Mighty 8K", "Sonic Mighty Revo", "Sonic Mini 8K S", "Sonic Mini 8K", "Sonic Mini 4K", "Sonic Mega 8K",
    ],
    "Sovol": [
      "SV08", "SV07", "SV06+", "SV06", "SV05", "SV04", "SV03", "SV02", "SV01",
    ],
    "Artillery": [
      "Sidewinder X4 Plus", "Sidewinder X2", "Sidewinder X1", "Genius Pro", "Genius",
    ],
    "Monoprice": [
      "Voxel", "Mini Delta V2", "Mini Delta", "Maker Select V2", "Maker Ultimate",
    ],
    "Tronxy": [
      "X5SA", "X5SA Pro", "XY-2 Pro", "VEHO 600",
    ],
    "Wanhao": [
      "Duplicator i3", "Duplicator 6", "Duplicator 7", "Duplicator 9", "D12",
    ],
    "Mingda": [
      "Magician X2", "Magician X", "Magician Pro", "MD-400D", "MD-1000 Pro",
    ],
    "Other": [
      "Custom FDM", "Custom CoreXY", "Custom Delta", "Resin (SLA/MSLA)", "SLS", "Other",
    ],
  },
  "laser-cut": {
    "xTool": ["P2", "P2S", "S1", "M1", "F1", "D1 Pro", "D1"],
    "Glowforge": ["Pro", "Plus", "Basic", "Aura"],
    "Omtech": ["Polar", "Polar+", "40W", "50W", "60W", "80W", "100W", "130W", "150W"],
    "Epilog": ["Fusion Pro", "Fusion Edge", "Fusion M2", "Zing 16", "Zing 24", "Mini", "Helix"],
    "Boss Laser": ["LS-1416", "LS-1630", "LS-2436", "HP-2436", "HP-3655"],
    "Trotec": ["Speedy 100", "Speedy 300", "Speedy 360", "Speedy 400", "SP500"],
    "Universal Laser": ["VLS3.50", "VLS4.60", "PLS4.75", "ILS9.150D"],
    "Gweike": ["Cloud Pro", "Cloud Basic", "G2 20W"],
    "Atomstack": ["X20 Pro", "X30 Pro", "A20 Pro", "S20 Pro"],
    "Ortur": ["Laser Master 3", "Laser Master 2 Pro"],
    "Sculpfun": ["S30 Pro Max", "S30 Pro", "S9", "SF-A9"],
    "Two Trees": ["TS2", "TTS-55", "TTS-25"],
    "Other": ["Custom CO2", "Diode Laser", "Fiber Laser", "Other"],
  },
  "embroidery": {
    "Brother": [
      "PR1055X", "PR680W", "PR670E", "Persona PRS100",
      "Entrepreneur Pro X PR1050X", "Entrepreneur W PR655", "Entrepreneur PR650",
      "SE1900", "SE625", "SE600", "PE900", "PE800", "PE770", "PE550D", "PE535",
      "Innov-is XP3", "Innov-is XP2", "Innov-is XP1", "Innov-is V7", "Innov-is V5", "Innov-is V3",
    ],
    "Tajima": [
      "Sai", "TMBR-SC", "TMBR-S", "TLMX", "TMEZ-SC", "TMEZ-S", "TFMX", "Neo2", "Neo",
    ],
    "Janome": [
      "MB-7", "MB-4S", "MB-4", "MC550E", "MC500E", "MC400E", "MC350E", "Memory Craft 9850",
    ],
    "Bernina": [
      "E 16", "790 Plus", "790 Pro", "770 QE", "590 E", "570 QE", "500 E",
    ],
    "Husqvarna Viking": [
      "Designer Epic 3", "Designer Epic 2", "Designer Brilliance 80", "Designer Diamond Royale",
    ],
    "Pfaff": [
      "creative icon 2", "creative icon", "creative 4.5", "creative 3.0",
    ],
    "Babylock": [
      "Vesta", "Valiant", "Venture", "Spirit", "Alliance", "Aerial", "Capella", "Solaris Vision",
    ],
    "Singer": [
      "Futura XL-580", "Futura XL-550", "Futura XL-400", "SE9180", "SE300",
    ],
    "Ricoma": [
      "EM-1010", "MT-1501", "MT-2002", "TC-1501", "SWD Series",
    ],
    "Melco": [
      "EMT16X", "EMT16", "Amaya XTS", "Bravo",
    ],
    "Barudan": [
      "BEKS Series", "BEKY Series", "BEXT Series",
    ],
    "ZSK": [
      "Sprint 7", "Racer", "Compact", "Stickautomat",
    ],
    "Other": ["Home Single Needle", "Home Multi-needle", "Commercial Multi-head", "Other"],
  },
  "vinyl": {
    "Cricut": [
      "Maker 3", "Maker", "Explore 3", "Explore Air 2", "Explore Air", "Explore One",
      "Joy Xtra", "Joy", "Venture",
    ],
    "Silhouette": [
      "Cameo 5 Plus", "Cameo 5", "Cameo 4 Plus", "Cameo 4", "Cameo 3", "Cameo 2",
      "Portrait 4", "Portrait 3", "Portrait 2", "Curio 2", "Curio", "Mint",
    ],
    "Roland": [
      "GS-24", "GR-540", "GR-420", "CAMM-1 GX-24", "BN-20A", "BN-20", "VG3-540", "VG3-640",
    ],
    "Graphtec": [
      "CE7000-40", "CE7000-60", "CE7000-130", "CE6000", "FC9000",
    ],
    "USCutter": [
      "MH 721", "MH 871", "Titan 3", "LaserPoint 3", "SC2",
    ],
    "Brother ScanNCut": [
      "SDX330D", "SDX230D", "SDX125", "CM350", "CM100DM",
    ],
    "Vevor": [
      "28-inch Plotter", "34-inch Plotter", "53-inch Plotter",
    ],
    "Other": ["Vinyl Plotter", "Print & Cut", "Heat Press Cutter", "Other"],
  },
};
