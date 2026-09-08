// Shared postcard design constants — used by both the on-screen preview
// (PostcardPreview.tsx) and the actual print HTML (payment.tsx) so they
// can't drift apart.

export const CARD_W_IN = 4.25;
export const CARD_H_IN = 6;
export const BORDER_IN = 0.5;   // top, left, right
export const BOTTOM_IN = 0.75;  // bottom border (thicker, holds caption text)

export const LOCATION = (process.env.EXPO_PUBLIC_LOCATION_NAME ?? 'YOUR LOCATION').toUpperCase();
export const YEAR = new Date().getFullYear();

// Caption ("LOCATION · YEAR") must never take up more than this fraction of
// the printed image's width — a long location name gets a smaller font
// instead of overflowing the border, in both portrait and landscape.
export const CAPTION_MAX_WIDTH_RATIO = 0.75;

// Caption font metrics for the system sans-serif font the print HTML renders
// in (WKWebView, no canvas available there to measure real glyph widths) —
// these estimate an average character width so fitCaptionFontSizePt can size
// the caption to stay within CAPTION_MAX_WIDTH_RATIO of the image.
const CAPTION_CHAR_WIDTH_EM = 0.66;
const CAPTION_LETTER_SPACING_EM = 0.1;
const CAPTION_MAX_FONT_PT = 10;
const CAPTION_MIN_FONT_PT = 6;

export function fitCaptionFontSizePt(text: string, maxWidthIn: number): number {
  const maxWidthPt = maxWidthIn * 72;
  const charCount = text.length;
  const emsPerPt =
    charCount * CAPTION_CHAR_WIDTH_EM + Math.max(0, charCount - 1) * CAPTION_LETTER_SPACING_EM;
  const fittedPt = emsPerPt > 0 ? maxWidthPt / emsPerPt : CAPTION_MAX_FONT_PT;
  return Math.min(CAPTION_MAX_FONT_PT, Math.max(CAPTION_MIN_FONT_PT, fittedPt));
}

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
