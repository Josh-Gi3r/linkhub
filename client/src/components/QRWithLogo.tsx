import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import QRCode from "qrcode";

export type LogoVariant = "dark-square" | "white-circle" | "green-square" | "green-circle";

export interface QRWithLogoHandle {
  downloadPNG: (filename?: string) => void;
  getDataURL: () => string;
}

interface QRWithLogoProps {
  value: string;
  /** Canvas size in px (default 256) */
  size?: number;
  logoVariant?: LogoVariant;
  /** Logo occupies this fraction of QR size (default 0.22) */
  logoFraction?: number;
  className?: string;
}

/**
 * Returns an SVG data URL for the app logo mark — no external fetch, no CORS issues.
 * The mark is drawn as a bold geometric letterform.
 */
function getAppLogoSvgDataUrl(variant: LogoVariant, sizePx: number): string {
  const configs: Record<LogoVariant, { bg: string; fg: string; shape: "square" | "circle" }> = {
    "dark-square":  { bg: "#000000", fg: "#00D26A", shape: "square" },
    "white-circle": { bg: "#FFFFFF", fg: "#000000", shape: "circle" },
    "green-square": { bg: "#00D26A", fg: "#000000", shape: "square" },
    "green-circle": { bg: "#00D26A", fg: "#000000", shape: "circle" },
  };
  const { bg, fg, shape } = configs[variant];
  const r = sizePx / 2;
  const bgShape =
    shape === "circle"
      ? `<circle cx="${r}" cy="${r}" r="${r}" fill="${bg}"/>`
      : `<rect width="${sizePx}" height="${sizePx}" fill="${bg}"/>`;

  // Bold geometric S — drawn as a path scaled to the viewBox
  const s = sizePx;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  ${bgShape}
  <text
    x="50" y="72"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="72"
    text-anchor="middle"
    fill="${fg}"
  >S</text>
</svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

/**
 * Renders a QR code with the app logo mark composited in the centre via <canvas>.
 * Error correction is set to "H" (30%) so the logo doesn't break readability.
 * Uses inline SVG for the logo — no CORS issues, works offline.
 * Exposes downloadPNG(filename) and getDataURL() via ref.
 */
const QRWithLogo = forwardRef<QRWithLogoHandle, QRWithLogoProps>(
  ({ value, size = 256, logoVariant = "dark-square", logoFraction = 0.22, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas || !value) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Use 2x internal resolution for crisp rendering on HiDPI screens
      const scale = window.devicePixelRatio || 1;
      const px = size * scale;
      canvas.width = px;
      canvas.height = px;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(scale, scale);

      // 1. Generate QR as a data URL with high error correction
      const qrDataUrl: string = await QRCode.toDataURL(value, {
        width: size,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" },
      });

      // 2. Draw QR onto canvas
      await new Promise<void>((resolve) => {
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(qrImg, 0, 0, size, size);
          resolve();
        };
        qrImg.onerror = () => resolve();
        qrImg.src = qrDataUrl;
      });

      // 3. Composite the app logo mark in the centre using inline SVG (no CORS)
      const logoSize = Math.round(size * logoFraction);
      const logoSvgUrl = getAppLogoSvgDataUrl(logoVariant, logoSize * 4); // 4x for sharpness
      await new Promise<void>((resolve) => {
        const logoImg = new Image();
        logoImg.onload = () => {
          const x = Math.round((size - logoSize) / 2);
          const y = Math.round((size - logoSize) / 2);
          // White padding so logo doesn't clash with QR modules
          const pad = Math.round(logoSize * 0.18);
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          resolve();
        };
        logoImg.onerror = () => resolve();
        logoImg.src = logoSvgUrl;
      });
    };

    useEffect(() => {
      draw();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, size, logoVariant, logoFraction]);

    useImperativeHandle(ref, () => ({
      downloadPNG: (filename = "linkhub-qr.png") => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Export at full internal resolution
        const a = document.createElement("a");
        a.download = filename;
        a.href = canvas.toDataURL("image/png");
        a.click();
      },
      getDataURL: () => {
        return canvasRef.current?.toDataURL("image/png") ?? "";
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={className}
        style={{ display: "block", width: size, height: size }}
      />
    );
  }
);

QRWithLogo.displayName = "QRWithLogo";
export default QRWithLogo;
