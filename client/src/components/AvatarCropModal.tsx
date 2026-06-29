import { useState, useCallback } from "react";
import Cropper, { type CropperProps } from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Check } from "lucide-react";

// ── Canvas helper: crop the image to the pixel area returned by react-easy-crop ──
async function getCroppedBlob(imageSrc: string, pixelCrop: Area, outputSize = 512): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvas.toDataURL("image/jpeg", 0.92);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface AvatarCropModalProps {
  /** Raw data-URL of the selected image */
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export default function AvatarCropModal({ imageSrc, onConfirm, onCancel }: AvatarCropModalProps) {
  const GREEN = "#00D26A";

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete: CropperProps["onCropComplete"] = useCallback(
    (_: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const result = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onConfirm(result);
    } catch {
      // Fallback: pass original if canvas fails (e.g. cross-origin)
      onConfirm(imageSrc);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4">
      <div
        className="bg-white border-2 border-black w-full max-w-sm flex flex-col"
        style={{ boxShadow: "8px 8px 0px #000" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black shrink-0">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">PHOTO</div>
            <div className="font-black text-sm uppercase tracking-tight">Position & Zoom</div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-black transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative bg-black shrink-0" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#111" },
              cropAreaStyle: {
                border: `2px solid ${GREEN}`,
                boxShadow: `0 0 0 9999px rgba(0,0,0,0.6)`,
              },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-5 py-4 border-t border-black/10 shrink-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">Zoom</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
              className="text-gray-500 hover:text-black transition-colors shrink-0"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#00D26A] cursor-pointer"
              style={{ accentColor: GREEN }}
            />
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="text-gray-500 hover:text-black transition-colors shrink-0"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="font-mono text-[9px] text-gray-400 text-center mt-1">
            Drag to reposition · Scroll or use slider to zoom
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t-2 border-black flex gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border-2 border-black text-black flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-black hover:text-white"
            style={{ boxShadow: `3px 3px 0px ${GREEN}` }}
          >
            <Check size={13} />
            {isProcessing ? "PROCESSING..." : "APPLY"}
          </button>
        </div>
      </div>
    </div>
  );
}
