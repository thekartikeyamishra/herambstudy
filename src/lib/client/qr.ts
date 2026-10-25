import qrcode from "qrcode-generator";

/** Longest link we put in a printed QR code; beyond this the code gets too dense to scan. */
export const MAX_QR_CHARS = 1200;

/** SVG path data for a QR code (one unit per module) plus its size, or null if the text is too long. */
export function qrPath(text: string): { d: string; size: number } | null {
  if (!text || text.length > MAX_QR_CHARS) return null;
  try {
    const qr = qrcode(0, "L");
    qr.addData(text, "Byte");
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    }
    return { d, size: n };
  } catch {
    return null;
  }
}
