/**
 * Aspect-locked crop-rectangle geometry.
 *
 * Every function here is a pure worklet with no closures, so the *same* math
 * runs on the UI thread (gesture handlers) and on the JS thread (zoom slider,
 * reset, restoring a saved rect, computing the final crop). That's the point
 * of the file: the rectangle the customer sees and the pixels we hand to
 * ImageManipulator can't drift apart, because they're the same code.
 *
 * Invariant: `h` is never an independent variable — it is always written as
 * `w / aspect`. Every function returns a fresh Rect (mutating `sv.value.x` in
 * place doesn't propagate in Reanimated), and callers only ever set the whole
 * object.
 */

export type Rect = { x: number; y: number; w: number; h: number };

// Drag modes, as integers rather than strings — these are written to a shared
// value on every gesture start and compared in worklets.
export const MODE_NONE = 0;
export const MODE_MOVE = 1;
export const CORNER_TL = 2;
export const CORNER_TR = 3;
export const CORNER_BL = 4;
export const CORNER_BR = 5;

/** The largest aspect-locked width that fits inside `bounds`. */
export function maxWidthIn(bounds: Rect, aspect: number): number {
  'worklet';
  return Math.min(bounds.w, bounds.h * aspect);
}

/** The default crop: the largest aspect-locked rect, centred in `bounds`. */
export function defaultRect(bounds: Rect, aspect: number): Rect {
  'worklet';
  const w = maxWidthIn(bounds, aspect);
  const h = w / aspect;
  return {
    x: bounds.x + (bounds.w - w) / 2,
    y: bounds.y + (bounds.h - h) / 2,
    w,
    h,
  };
}

/**
 * Clamp a fixed-size rect's top-left so the whole rect stays inside `bounds`.
 * Callers guarantee `w <= maxWidthIn(bounds, aspect)`, so the upper bound is
 * never below the lower one.
 */
export function clampToBounds(
  x: number,
  y: number,
  w: number,
  aspect: number,
  bounds: Rect,
): { x: number; y: number } {
  'worklet';
  const h = w / aspect;
  return {
    x: Math.min(Math.max(x, bounds.x), bounds.x + bounds.w - w),
    y: Math.min(Math.max(y, bounds.y), bounds.y + bounds.h - h),
  };
}

/**
 * Aspect-locked corner resize. The corner opposite the dragged one anchors and
 * never moves.
 *
 * All four corners share one formula. `sx`/`sy` say which way the dragged
 * corner lies from the anchor, which confines it to the ray
 * `anchor + t * (sx * aspect, sy)`. Projecting the finger onto that ray *is*
 * the "follow whichever axis the finger moved most" rule every cropper has,
 * except it comes out continuous — no jump when the finger crosses the
 * diagonal, and no per-corner branching to get wrong.
 *
 * The width is then clamped to [minW, maxW], where maxW also accounts for how
 * much room the anchor leaves inside `bounds` on *both* axes. So the rect can
 * never leave the photo, and never leaves it by shrinking one axis
 * independently of the other (which is how the old code produced off-ratio
 * crops that then got silently re-cropped downstream by object-fit: cover).
 */
export function resizeFromCorner(
  corner: number,
  start: Rect,
  fx: number,
  fy: number,
  aspect: number,
  minW: number,
  bounds: Rect,
): Rect {
  'worklet';
  const sx = corner === CORNER_TR || corner === CORNER_BR ? 1 : -1;
  const sy = corner === CORNER_BL || corner === CORNER_BR ? 1 : -1;

  // Anchor = the corner opposite the one being dragged.
  const ax = sx > 0 ? start.x : start.x + start.w;
  const ay = sy > 0 ? start.y : start.y + start.h;

  const vx = fx - ax;
  const vy = fy - ay;
  const t = (vx * sx * aspect + vy * sy) / (aspect * aspect + 1);
  let w = t * aspect;

  const availX = sx > 0 ? bounds.x + bounds.w - ax : ax - bounds.x;
  const availY = sy > 0 ? bounds.y + bounds.h - ay : ay - bounds.y;
  const maxW = Math.min(availX, availY * aspect, maxWidthIn(bounds, aspect));

  // Math.min(minW, maxW): on a source too low-res to satisfy MIN_CROP_DPI the
  // floor would otherwise exceed the ceiling and lock the screen up. Degrade
  // to "as big as it can be" instead.
  w = Math.min(Math.max(w, Math.min(minW, maxW)), maxW);
  const h = w / aspect;

  return {
    x: sx > 0 ? ax : ax - w,
    y: sy > 0 ? ay : ay - h,
    w,
    h,
  };
}

/**
 * Resize about a fixed centre — used by the zoom slider and by pinch.
 *
 * Note the order: the *size* is clamped first, then the *position* is clamped
 * into bounds. Capping the size by the distance from the centre to the nearest
 * edge instead would make the widest crop unreachable whenever the rectangle
 * happens to sit off-centre, and the slider has to be able to reach it from
 * anywhere.
 */
export function resizeAboutCenter(
  cx: number,
  cy: number,
  w: number,
  aspect: number,
  minW: number,
  bounds: Rect,
): Rect {
  'worklet';
  const maxW = maxWidthIn(bounds, aspect);
  const cw = Math.min(Math.max(w, Math.min(minW, maxW)), maxW);
  const ch = cw / aspect;
  const p = clampToBounds(cx - cw / 2, cy - ch / 2, cw, aspect, bounds);
  return { x: p.x, y: p.y, w: cw, h: ch };
}
