import { useRef, useState } from "react";
import { Upload, CheckCircle2, X, Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  /** Single printer photo (with serial visible). */
  printerPhotoUrl: string | null;
  onPrinterPhoto: (url: string | null) => void;
  /** Up to 3 sample prints. */
  samplePrintUrls: string[];
  onSamplePrints: (urls: string[]) => void;
};

const BUCKET = "printer-verification";

export const VerificationUploader = ({
  userId,
  printerPhotoUrl,
  onPrinterPhoto,
  samplePrintUrls,
  onSamplePrints,
}: Props) => {
  const [uploadingPrinter, setUploadingPrinter] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);
  const printerInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePrinterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPrinter(true);
    try {
      const url = await upload(file, "printer");
      onPrinterPhoto(url);
      toast.success("Printer photo uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingPrinter(false);
      if (printerInputRef.current) printerInputRef.current.value = "";
    }
  };

  const handleSamplePrint = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (samplePrintUrls.length + files.length > 3) {
      toast.error("Up to 3 sample prints");
      return;
    }
    setUploadingSample(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        urls.push(await upload(f, "sample"));
      }
      onSamplePrints([...samplePrintUrls, ...urls]);
      toast.success(`${urls.length} sample print${urls.length > 1 ? "s" : ""} uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploadingSample(false);
      if (sampleInputRef.current) sampleInputRef.current.value = "";
    }
  };

  const removeSample = (i: number) => {
    onSamplePrints(samplePrintUrls.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      {/* Printer photo */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Printer photo (serial visible)</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              One photo of your machine with the serial number / sticker visible.
              This is how we verify you actually own the printer.
            </p>
          </div>
          {printerPhotoUrl && <CheckCircle2 className="h-5 w-5 text-primary" />}
        </div>
        <input
          ref={printerInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePrinterPhoto}
        />
        <button
          type="button"
          onClick={() => printerInputRef.current?.click()}
          disabled={uploadingPrinter}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-sm transition-colors",
            printerPhotoUrl
              ? "border-primary/40 bg-primary/5"
              : "border-border hover:border-primary/60",
          )}
        >
          {printerPhotoUrl ? (
            <img src={printerPhotoUrl} alt="Your printer" className="max-h-40 rounded-xl object-cover" />
          ) : (
            <>
              <Camera className="h-4 w-4" />
              {uploadingPrinter ? "Uploading…" : "Take or upload photo"}
            </>
          )}
        </button>
        {printerPhotoUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => printerInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" /> Replace photo
          </Button>
        )}
      </div>

      {/* Sample prints */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">3 sample prints</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Show off recent work — close-up photos with good lighting.
              ({samplePrintUrls.length}/3)
            </p>
          </div>
          {samplePrintUrls.length >= 3 && <CheckCircle2 className="h-5 w-5 text-primary" />}
        </div>
        <input
          ref={sampleInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleSamplePrint}
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {samplePrintUrls.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={url} alt={`Sample ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeSample(i)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {samplePrintUrls.length < 3 && (
            <button
              type="button"
              onClick={() => sampleInputRef.current?.click()}
              disabled={uploadingSample}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationUploader;
