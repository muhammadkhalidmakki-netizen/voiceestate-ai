import type { Palette } from "./palette";

export function tooltipBase(p: Palette) {
  return {
    backgroundColor: p.dark ? "rgba(22,31,70,0.92)" : "rgba(255,255,255,0.92)",
    borderColor: p.line,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: p.ink, fontFamily: "inherit", fontSize: 12 },
    extraCssText:
      "border-radius:14px;backdrop-filter:blur(8px);box-shadow:0 12px 30px -12px rgba(20,40,120,0.45);",
  };
}

export const axisText = (p: Palette) => ({ color: p.ink3, fontFamily: "inherit", fontSize: 11 });

/** Diagonal hatch pattern. Used to mean "unknown / not validated", everywhere. */
export const hatch = (p: Palette) => ({
  symbol: "rect",
  rotation: Math.PI / 4,
  dashArrayX: [1, 0],
  dashArrayY: [2, 4],
  color: p.hatch,
});

/** "#rrggbb" + alpha -> rgba(). Lets chart fills follow the active theme's accent. */
export function alpha(hex: string, a: number): string {
  const h = hex.trim().replace("#", "");
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
