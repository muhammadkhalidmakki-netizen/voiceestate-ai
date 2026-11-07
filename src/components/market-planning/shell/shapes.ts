// SVG path builders for the hero tiles. Every corner is rounded and the notches are exact
// complements of each other, so neighbouring tiles interlock with an even gap (Zassk-style).
// Pure functions: sizes in, a path() string for CSS clip-path out.

const n = (v: number) => Math.round(v * 100) / 100;

export const TILE_RADIUS = 24;
export const NOTCH_RADIUS = 12;

/** A rounded tile with a rectangular notch cut out of its TOP-RIGHT corner. */
export function pathTopRightNotch(w: number, h: number, cw: number, ch: number): string {
  const R = TILE_RADIUS;
  const r = NOTCH_RADIUS;
  return (
    `path('M ${n(R)} 0 H ${n(w - cw - r)} A ${r} ${r} 0 0 1 ${n(w - cw)} ${r} V ${n(ch - r)} ` +
    `A ${r} ${r} 0 0 0 ${n(w - cw + r)} ${n(ch)} H ${n(w - r)} A ${r} ${r} 0 0 1 ${n(w)} ${n(ch + r)} ` +
    `V ${n(h - R)} A ${R} ${R} 0 0 1 ${n(w - R)} ${n(h)} H ${n(R)} A ${R} ${R} 0 0 1 0 ${n(h - R)} ` +
    `V ${R} A ${R} ${R} 0 0 1 ${R} 0 Z')`
  );
}

/** A rounded tile with a rectangular notch cut out of its BOTTOM-RIGHT corner. */
export function pathBottomRightNotch(w: number, h: number, cw: number, ch: number): string {
  const R = TILE_RADIUS;
  const r = NOTCH_RADIUS;
  return (
    `path('M ${R} 0 H ${n(w - R)} A ${R} ${R} 0 0 1 ${n(w)} ${R} V ${n(h - ch - r)} ` +
    `A ${r} ${r} 0 0 1 ${n(w - r)} ${n(h - ch)} H ${n(w - cw + r)} A ${r} ${r} 0 0 0 ${n(w - cw)} ${n(h - ch + r)} ` +
    `V ${n(h - r)} A ${r} ${r} 0 0 1 ${n(w - cw - r)} ${n(h)} H ${R} A ${R} ${R} 0 0 1 0 ${n(h - R)} ` +
    `V ${R} A ${R} ${R} 0 0 1 ${R} 0 Z')`
  );
}

/**
 * A rounded tile whose box is `tab` taller than the visible tile. The extra band at the top is
 * transparent except for a tab spanning x0..x1 that rises into the neighbour's notch.
 */
export function pathTopTab(w: number, h: number, tab: number, x0: number, x1: number): string {
  const R = TILE_RADIUS;
  const r = NOTCH_RADIUS;
  return (
    `path('M ${R} ${n(tab)} H ${n(x0 - r)} A ${r} ${r} 0 0 0 ${n(x0)} ${n(tab - r)} V ${r} ` +
    `A ${r} ${r} 0 0 1 ${n(x0 + r)} 0 H ${n(x1 - r)} A ${r} ${r} 0 0 1 ${n(x1)} ${r} V ${n(tab - r)} ` +
    `A ${r} ${r} 0 0 0 ${n(x1 + r)} ${n(tab)} H ${n(w - R)} A ${R} ${R} 0 0 1 ${n(w)} ${n(tab + R)} ` +
    `V ${n(h - R)} A ${R} ${R} 0 0 1 ${n(w - R)} ${n(h)} H ${R} A ${R} ${R} 0 0 1 0 ${n(h - R)} ` +
    `V ${n(tab + R)} A ${R} ${R} 0 0 1 ${R} ${n(tab)} Z')`
  );
}

export type Interlock = {
  /** Notch size cut out of tile B's bottom-right corner (and filled by tile D's tab). */
  cw: number;
  ch: number;
  /** The gap between tiles, so the tab sits exactly one gap away from the notch walls. */
  gap: number;
};

/** The x-range of D's tab, in D's own coordinates, given B's width. */
export function tabRange(bWidth: number, il: Interlock): { x0: number; x1: number } {
  return { x0: bWidth - il.cw + il.gap, x1: bWidth };
}
