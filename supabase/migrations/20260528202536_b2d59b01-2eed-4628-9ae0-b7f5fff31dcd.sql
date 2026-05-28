ALTER TABLE public.printers
  ADD COLUMN IF NOT EXISTS service text NOT NULL DEFAULT '3d_print';

ALTER TABLE public.printers
  DROP CONSTRAINT IF EXISTS printers_service_check;

ALTER TABLE public.printers
  ADD CONSTRAINT printers_service_check
  CHECK (service IN ('3d_print', 'laser_cut', 'embroidery', 'vinyl'));

CREATE INDEX IF NOT EXISTS idx_printers_service ON public.printers(service);