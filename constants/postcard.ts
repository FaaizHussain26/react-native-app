// Shared postcard design constants — used by both the on-screen preview
// (PostcardPreview.tsx) and the actual print HTML (payment.tsx) so they
// can't drift apart.

export const CARD_W_IN = 4.25;
export const CARD_H_IN = 6;
export const BORDER_IN = 0.5;   // top, left, right
export const BOTTOM_IN = 0.75;  // bottom border (thicker, holds caption text)

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
