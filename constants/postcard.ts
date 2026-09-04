// Shared postcard design constants — used by both the on-screen preview
// (PostcardPreview.tsx) and the actual print HTML (payment.tsx) so they
// can't drift apart.

export const CARD_W_IN = 4.25;
export const CARD_H_IN = 6;
export const BORDER_IN = 0.5;   // top, left, right
export const BOTTOM_IN = 0.75;  // bottom border (thicker, holds caption text)

// The printable photo area inside the borders, per orientation. This is the
// single definition of the shape a cropped photo has to be — the crop frame,
// the on-screen preview and the print HTML all derive from it, so the crop
// matching the print is structural rather than three separate calculations
// that happen to agree.
export const IMAGE_AREA_IN = {
  portrait: { w: CARD_W_IN - 2 * BORDER_IN, h: CARD_H_IN - BORDER_IN - BOTTOM_IN },   // 3.25 x 4.75
  landscape: { w: CARD_H_IN - 2 * BORDER_IN, h: CARD_W_IN - BORDER_IN - BOTTOM_IN },  // 5.00 x 3.00
} as const;

// 0.6842105 (portrait) / 1.6666667 (landscape).
export const imageAreaAspect = (o: 'portrait' | 'landscape') =>
  IMAGE_AREA_IN[o].w / IMAGE_AREA_IN[o].h;

// Floor on how tight a crop we let the customer make: below this the printed
// card visibly softens. Bounds the crop rectangle's minimum size.
export const MIN_CROP_DPI = 150;

// Output cap. Photo printers don't resolve past this, and it also bounds the
// base64 data URI payment.tsx inlines into the print HTML.
export const PRINT_DPI = 300;

export const LOCATION = (process.env.EXPO_PUBLIC_LOCATION_NAME ?? 'YOUR LOCATION').toUpperCase();
export const YEAR = new Date().getFullYear();

// Outer "card mount" frame shared by every screen that displays the
// postcard front (edit/review/print), so the presentation chrome stays
// consistent app-wide.
export const CARD_FRAME = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 6,
} as const;
