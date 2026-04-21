-- Filament colors / inventory per printer
CREATE TABLE public.filament_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  material text NOT NULL,
  color_name text NOT NULL,
  hex_code text NOT NULL DEFAULT '#000000',
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(printer_id, material, color_name)
);

CREATE INDEX idx_filament_colors_printer ON public.filament_colors(printer_id);
CREATE INDEX idx_filament_colors_material ON public.filament_colors(material);

ALTER TABLE public.filament_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filament colors are viewable by everyone"
  ON public.filament_colors FOR SELECT USING (true);

CREATE POLICY "Makers can insert filament colors for their printers"
  ON public.filament_colors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.printers p
    WHERE p.id = printer_id AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Makers can update filament colors for their printers"
  ON public.filament_colors FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.printers p
    WHERE p.id = printer_id AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Makers can delete filament colors for their printers"
  ON public.filament_colors FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.printers p
    WHERE p.id = printer_id AND p.owner_id = auth.uid()
  ));

-- Seed default PLA colors for every existing printer
INSERT INTO public.filament_colors (printer_id, material, color_name, hex_code)
SELECT p.id, 'PLA', c.name, c.hex
FROM public.printers p
CROSS JOIN (VALUES
  ('Black', '#111111'),
  ('White', '#F5F5F5'),
  ('Red', '#E63946'),
  ('Blue', '#1D4ED8'),
  ('Green', '#16A34A'),
  ('Yellow', '#FACC15'),
  ('Orange', '#F97316'),
  ('Purple', '#9333EA'),
  ('Pink', '#EC4899'),
  ('Gray', '#6B7280'),
  ('Silver', '#C0C0C0'),
  ('Gold', '#D4AF37')
) AS c(name, hex)
ON CONFLICT DO NOTHING;