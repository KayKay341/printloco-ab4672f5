// Most popular consumer/prosumer 3D printers (2024–2025 market data)
// Sourced from Tom's Hardware, CNET, Bambu Lab, Prusa, Creality, Anycubic, Elegoo, Formlabs.
export const POPULAR_PRINTERS: { brand: string; model: string }[] = [
  // Bambu Lab — #1 entry-level shipments 2025
  { brand: "Bambu Lab", model: "X1 Carbon" },
  { brand: "Bambu Lab", model: "X1E" },
  { brand: "Bambu Lab", model: "P1S" },
  { brand: "Bambu Lab", model: "P1P" },
  { brand: "Bambu Lab", model: "A1" },
  { brand: "Bambu Lab", model: "A1 Mini" },
  { brand: "Bambu Lab", model: "H2D" },
  // Prusa Research
  { brand: "Prusa", model: "MK4S" },
  { brand: "Prusa", model: "MK4" },
  { brand: "Prusa", model: "MK3S+" },
  { brand: "Prusa", model: "XL" },
  { brand: "Prusa", model: "Mini+" },
  { brand: "Prusa", model: "CORE One" },
  // Creality
  { brand: "Creality", model: "K1" },
  { brand: "Creality", model: "K1 Max" },
  { brand: "Creality", model: "K1C" },
  { brand: "Creality", model: "K2 Plus" },
  { brand: "Creality", model: "Ender 3 V3 SE" },
  { brand: "Creality", model: "Ender 3 V3 KE" },
  { brand: "Creality", model: "Ender 3 S1 Pro" },
  { brand: "Creality", model: "Ender 5 S1" },
  { brand: "Creality", model: "CR-10 Smart Pro" },
  // Anycubic
  { brand: "Anycubic", model: "Kobra 3" },
  { brand: "Anycubic", model: "Kobra 2 Pro" },
  { brand: "Anycubic", model: "Kobra 2 Max" },
  { brand: "Anycubic", model: "Photon Mono M5s" },
  { brand: "Anycubic", model: "Photon Mono X 6Ks" },
  // Elegoo
  { brand: "Elegoo", model: "Neptune 4 Pro" },
  { brand: "Elegoo", model: "Neptune 4 Max" },
  { brand: "Elegoo", model: "Centauri Carbon" },
  { brand: "Elegoo", model: "Saturn 4 Ultra" },
  { brand: "Elegoo", model: "Mars 5 Ultra" },
  // Formlabs (resin/SLA)
  { brand: "Formlabs", model: "Form 3+" },
  { brand: "Formlabs", model: "Form 4" },
  // Voron community
  { brand: "Voron", model: "2.4" },
  { brand: "Voron", model: "Trident" },
  { brand: "Voron", model: "0.2" },
  // FlashForge
  { brand: "FlashForge", model: "Adventurer 5M Pro" },
  { brand: "FlashForge", model: "AD5X" },
  // Qidi
  { brand: "Qidi Tech", model: "Q1 Pro" },
  { brand: "Qidi Tech", model: "X-Max 3" },
  { brand: "Qidi Tech", model: "X-Plus 3" },
  // Ultimaker / MakerBot (prosumer)
  { brand: "Ultimaker", model: "S5" },
  { brand: "Ultimaker", model: "S7" },
  // Snapmaker (multi-tool)
  { brand: "Snapmaker", model: "Artisan" },
  { brand: "Snapmaker", model: "J1s" },
];

export const POPULAR_PRINTER_OPTIONS = POPULAR_PRINTERS.map(
  (p) => `${p.brand} ${p.model}`,
);
