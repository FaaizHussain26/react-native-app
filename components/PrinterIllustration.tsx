import React from 'react';
import Svg, {
  Rect, Path, G, Defs, LinearGradient, Stop, Circle, Ellipse, Line,
} from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export const PrinterIllustration = ({ width = 300, height = 240 }: Props) => (
  <Svg width={width} height={height} viewBox="0 0 300 240">
    <Defs>
      <LinearGradient id="printerBody" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#3A4E35" />
        <Stop offset="1" stopColor="#2A3B26" />
      </LinearGradient>
      <LinearGradient id="printerTop" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#4A5E45" />
        <Stop offset="1" stopColor="#3A4E35" />
      </LinearGradient>
      <LinearGradient id="card" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="1" stopColor="#F3EEE7" />
      </LinearGradient>
      <LinearGradient id="cardImg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#A8D8EA" />
        <Stop offset="1" stopColor="#5A8A65" />
      </LinearGradient>
    </Defs>

    {/* ── Printer shadow ── */}
    <Ellipse cx="150" cy="215" rx="100" ry="12" fill="#00000018" />

    {/* ── Paper tray (back input) ── */}
    <Rect x="70" y="60" width="160" height="10" rx="3" fill="#1E2B1A" />
    <Rect x="80" y="56" width="140" height="10" rx="3" fill="#253220" />

    {/* ── Printer body ── */}
    <Rect x="40" y="70" width="220" height="110" rx="12" fill="url(#printerBody)" />

    {/* Top face of printer */}
    <Rect x="40" y="70" width="220" height="30" rx="12" fill="url(#printerTop)" />
    {/* Front slot opening */}
    <Rect x="55" y="145" width="190" height="16" rx="4" fill="#1A2718" />

    {/* Control panel area */}
    <Rect x="180" y="80" width="68" height="14" rx="4" fill="#1E2B1A" />
    {/* LED dots */}
    <Circle cx="194" cy="87" r="4" fill="#4CAF50" opacity="0.9" />
    <Circle cx="210" cy="87" r="4" fill="#4CAF50" opacity="0.5" />
    <Circle cx="226" cy="87" r="4" fill="#F3EEE7" opacity="0.3" />

    {/* Posta logo area on printer */}
    <Rect x="55" y="80" width="110" height="14" rx="3" fill="#1E2B1A" opacity="0.5" />
    <Rect x="62" y="85" width="60" height="4" rx="2" fill="#F3EEE7" opacity="0.3" />

    {/* Bottom body */}
    <Rect x="40" y="150" width="220" height="30" rx="12" fill="#253220" />

    {/* Feet */}
    <Rect x="60" y="175" width="30" height="10" rx="4" fill="#1A2718" />
    <Rect x="210" y="175" width="30" height="10" rx="4" fill="#1A2718" />

    {/* ── Postcard coming out of slot ── */}
    <G>
      {/* Card shadow */}
      <Rect x="81" y="130" width="138" height="78" rx="3" fill="#00000020" transform="translate(3,3)" />

      {/* Card body */}
      <Rect x="81" y="126" width="138" height="78" rx="3" fill="url(#card)" />

      {/* Image area on card */}
      <Rect x="89" y="133" width="122" height="54" rx="2" fill="url(#cardImg)" />

      {/* Mini mountain in card */}
      <Path d="M89,187 L120,158 L151,187 Z" fill="#3D6B47" opacity="0.9" />
      <Path d="M130,187 L160,150 L190,187 Z" fill="#2A3B26" opacity="0.85" />
      <Path d="M158,160 L160,150 L162,160 Z" fill="white" opacity="0.8" />

      {/* Card bottom border with text lines */}
      <Rect x="89" y="187" width="122" height="17" fill="white" />
      <Rect x="100" y="191" rx="1" ry="1" width="100" height="3" fill="#5A5248" opacity="0.3" />
      <Rect x="108" y="198" rx="1" ry="1" width="84" height="2" fill="#5A5248" opacity="0.18" />

      {/* Motion lines above card (printing effect) */}
      <Line x1="105" y1="120" x2="105" y2="112" stroke="#4A5E45" strokeWidth="1.5" strokeDasharray="2,3" opacity="0.5" />
      <Line x1="150" y1="118" x2="150" y2="110" stroke="#4A5E45" strokeWidth="1.5" strokeDasharray="2,3" opacity="0.5" />
      <Line x1="195" y1="120" x2="195" y2="112" stroke="#4A5E45" strokeWidth="1.5" strokeDasharray="2,3" opacity="0.5" />
    </G>
  </Svg>
);
