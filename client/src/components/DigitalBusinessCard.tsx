import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import QRCode from "qrcode";

export interface DigitalBusinessCardHandle {
  downloadPNG: (filename?: string) => void;
}

interface DigitalBusinessCardProps {
  displayName: string;
  jobTitle?: string | null;
  profileUrl: string;
  /** Display width in px — height auto-calculated at ISO ID-1 ratio (85.6:54 ≈ 1.585:1) */
  width?: number;
  className?: string;
}

/**
 * Digital Business Card
 *
 * ISO ID-1 format: 85.6mm × 54mm (exact credit card dimensions).
 * At 300 DPI this is 1011 × 638px; the canvas exports at 3× for print.
 *
 * Design:
 *   - White background (printable)
 *   - 1px black border all around
 *   - Thick black left accent bar
 *   - Brand accent color (#00D26A by default, override via --brand CSS var)
 *   - Sharp corners everywhere, no border-radius
 *   - Left zone: app logo · name (auto-scaled) · job title · URL
 *   - Right zone: QR code (H error correction) with app logo mark in centre
 *   - Bottom strip: light grey, URL + "DIGITAL CARD" label
 */
const DigitalBusinessCard = forwardRef<DigitalBusinessCardHandle, DigitalBusinessCardProps>(
  ({ displayName, jobTitle, profileUrl, width = 500, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const W = width;
    const H = Math.round(W / (85.6 / 54));

    useEffect(() => {
      renderCard(canvasRef.current, W, H, displayName, jobTitle, profileUrl, 1);
    }, [displayName, jobTitle, profileUrl, W, H]);

    useImperativeHandle(ref, () => ({
      downloadPNG: async (filename = "digital-card.png") => {
        const offscreen = document.createElement("canvas");
        offscreen.width = W * 3;
        offscreen.height = H * 3;
        await renderCard(offscreen, W, H, displayName, jobTitle, profileUrl, 3);
        const a = document.createElement("a");
        a.download = filename;
        a.href = offscreen.toDataURL("image/png");
        a.click();
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: W, height: H }}
        className={className}
      />
    );
  }
);

DigitalBusinessCard.displayName = "DigitalBusinessCard";
export default DigitalBusinessCard;

// ─────────────────────────────────────────────────────────────────────────────
// Core render — works on any canvas (screen or offscreen)
// ─────────────────────────────────────────────────────────────────────────────

async function renderCard(
  canvas: HTMLCanvasElement | null,
  W: number,
  H: number,
  displayName: string,
  jobTitle: string | null | undefined,
  profileUrl: string,
  scale: number
) {
  if (!canvas) return;

  canvas.width = W * scale;
  canvas.height = H * scale;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // ── Design tokens (GREEN = brand accent — matches --brand CSS variable) ──────
  const BLACK      = "#000000";
  const WHITE      = "#FFFFFF";
  // Override by exporting VITE_BRAND_COLOR=«hex» in your .env
  const GREEN      = (typeof window !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue("--brand").trim()) || "#22c55e";
  const GREY       = "#777777";
  const LIGHT_GREY = "#F2F2F2";
  const BORDER     = 1.5;

  // Layout constants
  const LEFT_BAR_W  = Math.round(W * 0.028);   // thick black left bar
  const BOTTOM_H    = Math.round(H * 0.115);   // bottom strip height
  const PAD_L       = LEFT_BAR_W + Math.round(W * 0.048);
  const PAD_T       = Math.round(H * 0.1);
  const PAD_R       = Math.round(W * 0.04);
  const CONTENT_H   = H - BOTTOM_H;

  // ── White background ───────────────────────────────────────────────────────
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);

  // ── QR code (right side, vertically centred in content zone) ──────────────
  const QR_SIZE = Math.round(CONTENT_H * 0.76);
  const QR_X    = Math.round(W - QR_SIZE - PAD_R);
  const QR_Y    = Math.round((CONTENT_H - QR_SIZE) / 2);

  // White QR background
  ctx.fillStyle = WHITE;
  ctx.fillRect(QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // Generate QR data URL
  const qrDataUrl: string = await QRCode.toDataURL(profileUrl, {
    width: QR_SIZE * 4,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: BLACK, light: WHITE },
  });
  await loadImage(qrDataUrl, (img) => ctx.drawImage(img, QR_X, QR_Y, QR_SIZE, QR_SIZE));

  // App logo mark in QR centre (white bg + accent color)
  const QR_LOGO_SIZE = Math.round(QR_SIZE * 0.2);
  const QR_LOGO_PAD  = Math.round(QR_LOGO_SIZE * 0.22);
  const QR_LOGO_X    = QR_X + Math.round((QR_SIZE - QR_LOGO_SIZE) / 2);
  const QR_LOGO_Y    = QR_Y + Math.round((QR_SIZE - QR_LOGO_SIZE) / 2);
  ctx.fillStyle = WHITE;
  ctx.fillRect(QR_LOGO_X - QR_LOGO_PAD, QR_LOGO_Y - QR_LOGO_PAD, QR_LOGO_SIZE + QR_LOGO_PAD * 2, QR_LOGO_SIZE + QR_LOGO_PAD * 2);
  drawLogoMark(ctx, QR_LOGO_X, QR_LOGO_Y, QR_LOGO_SIZE, GREEN, WHITE);

  // ── Left content zone ──────────────────────────────────────────────────────
  // Hard cap: left zone NEVER exceeds 45% of card width regardless of QR position
  const LEFT_MAX_W = Math.min(QR_X - PAD_L - Math.round(W * 0.04), Math.round(W * 0.45));

  // App logo mark (small square, top-left)
  const LOGO_SIZE = Math.round(H * 0.18);
  drawLogoMark(ctx, PAD_L, PAD_T, LOGO_SIZE, GREEN, BLACK);

  // App name wordmark beside logo — accent color for primary segment
  const WM_FONT = Math.round(H * 0.075);
  ctx.font = `900 ${WM_FONT}px "Arial Black", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  const WM_X = PAD_L + LOGO_SIZE + Math.round(W * 0.022);
  const WM_Y = PAD_T + LOGO_SIZE / 2;
  // Draw app name — accent for first part, white for rest
  const appName = (import.meta.env.VITE_APP_NAME as string | undefined) ?? "LinkHub";
  const dotIdx = appName.search(/[^a-zA-Z]/);
  const namePrimary = dotIdx > 0 ? appName.slice(0, dotIdx) : appName;
  const nameSuffix = dotIdx > 0 ? appName.slice(dotIdx) : "";
  ctx.fillStyle = GREEN;
  ctx.fillText(namePrimary, WM_X, WM_Y);
  if (nameSuffix) {
    const primaryWidth = ctx.measureText(namePrimary).width;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(nameSuffix, WM_X + primaryWidth, WM_Y);
  }

  // Centre X of the left content zone
  const LEFT_ZONE_MID = PAD_L + Math.round(LEFT_MAX_W / 2);

  // Name — auto-scale font to always fit LEFT_MAX_W, with ellipsis fallback
  const NAME_Y = PAD_T + LOGO_SIZE + Math.round(H * 0.07);
  const nameFontSize = autoFontSize(ctx, displayName.toUpperCase(), LEFT_MAX_W, Math.round(H * 0.135), Math.round(H * 0.055), "900 {size}px \"Arial Black\", Arial, sans-serif");
  ctx.fillStyle = BLACK;
  ctx.font = `900 ${nameFontSize}px "Arial Black", Arial, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  // Final safety: truncate with ellipsis if still too wide at minimum font size
  const nameText = fitText(ctx, displayName.toUpperCase(), LEFT_MAX_W);
  ctx.fillText(nameText, LEFT_ZONE_MID, NAME_Y);
  ctx.textAlign = "left";

  // Green underline — centred under name
  const underlineY = NAME_Y + nameFontSize + Math.round(H * 0.012);
  const underlineW = Math.min(Math.round(LEFT_MAX_W * 0.65), Math.round(ctx.measureText(nameText).width + 4));
  ctx.fillStyle = GREEN;
  ctx.fillRect(LEFT_ZONE_MID - Math.round(underlineW / 2), underlineY, underlineW, 2.5);

  // Job title — centred
  if (jobTitle) {
    const JOB_Y = underlineY + Math.round(H * 0.04);
    const JOB_FONT = Math.round(H * 0.068);
    ctx.fillStyle = GREY;
    ctx.font = `400 ${JOB_FONT}px "Courier New", monospace`;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillText(fitText(ctx, jobTitle, LEFT_MAX_W), LEFT_ZONE_MID, JOB_Y);
    ctx.textAlign = "left";
  }

  // ── Bottom strip ───────────────────────────────────────────────────────────
  const STRIP_Y = H - BOTTOM_H;
  ctx.fillStyle = LIGHT_GREY;
  ctx.fillRect(LEFT_BAR_W, STRIP_Y, W - LEFT_BAR_W, BOTTOM_H);

  // Thin rule above strip
  ctx.fillStyle = "#DDDDDD";
  ctx.fillRect(LEFT_BAR_W, STRIP_Y, W - LEFT_BAR_W, 1);

  const STRIP_PAD_T = Math.round(BOTTOM_H * 0.28);
  const LABEL_FONT  = Math.round(H * 0.058);

  // "DIGITAL CARD" label — centred in strip, no URL text
  ctx.fillStyle = GREY;
  ctx.font = `400 ${LABEL_FONT}px "Courier New", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("DIGITAL CARD", W - PAD_R, STRIP_Y + STRIP_PAD_T);
  ctx.textAlign = "left";

  // ── Black left accent bar (drawn last so it's on top) ─────────────────────
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, LEFT_BAR_W, H);

  // ── 1px black border ───────────────────────────────────────────────────────
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = BORDER;
  ctx.strokeRect(BORDER / 2, BORDER / 2, W - BORDER, H - BORDER);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Draw the app logo mark as a filled square with a bold letter */
function drawLogoMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fg: string,
  bg: string
) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, size, size);

  const fontSize = Math.round(size * 0.76);
  ctx.fillStyle = fg;
  ctx.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const appInitial = (typeof window !== 'undefined' && document.title ? document.title[0] : 'L').toUpperCase();
  ctx.fillText(appInitial, x + size / 2, y + size / 2 + Math.round(size * 0.02));
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

/**
 * Auto-scale font size so text fits within maxWidth.
 * Starts at maxSize and steps down to minSize.
 * fontTemplate must contain "{size}" placeholder.
 */
function autoFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  fontTemplate: string
): number {
  for (let size = maxSize; size >= minSize; size -= 1) {
    ctx.font = fontTemplate.replace("{size}", String(size));
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

/** Truncate text to fit maxWidth with ellipsis */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

/** Load an image from a data URL and call cb when ready */
function loadImage(src: string, cb: (img: HTMLImageElement) => void): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { cb(img); resolve(); };
    img.onerror = () => resolve();
    img.src = src;
  });
}
