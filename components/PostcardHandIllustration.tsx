import React from 'react';
import Svg, {
  Rect, Path, G, Defs, LinearGradient, Stop, Circle, Ellipse, Line,
} from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export const PostcardHandIllustration = ({ width = 380, height = 460 }: Props) => (
  <Svg width={width} height={height} viewBox="0 0 380 460">
    <Defs>
      <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#A8D8EA" />
        <Stop offset="1" stopColor="#D4ECF7" />
      </LinearGradient>
      <LinearGradient id="hills" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#5A8A65" />
        <Stop offset="1" stopColor="#3D6B47" />
      </LinearGradient>
      <LinearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#F5C8A0" />
        <Stop offset="1" stopColor="#E8A87C" />
      </LinearGradient>
      <LinearGradient id="cardShadow" x1="0" y1="0" x2="0.3" y2="1">
        <Stop offset="0" stopColor="#00000018" />
        <Stop offset="1" stopColor="#00000000" />
      </LinearGradient>
    </Defs>

    {/* ── Drop shadow ── */}
    <Rect x="74" y="32" width="232" height="310" rx="10" fill="#00000015" transform="rotate(3 190 187)" />

    {/* ── Postcard (slightly tilted) ── */}
    <G transform="rotate(-4 190 185)">
      {/* Card body */}
      <Rect x="72" y="18" width="236" height="332" rx="10" fill="white" />

      {/* Image area — top/side 0.5in border equivalent */}
      <Rect x="86" y="32" width="208" height="242" rx="4" fill="url(#sky)" />

      {/* Clouds */}
      <Ellipse cx="130" cy="65" rx="28" ry="14" fill="white" opacity="0.8" />
      <Ellipse cx="152" cy="58" rx="22" ry="12" fill="white" opacity="0.9" />
      <Ellipse cx="240" cy="75" rx="24" ry="11" fill="white" opacity="0.7" />
      <Ellipse cx="260" cy="68" rx="18" ry="10" fill="white" opacity="0.85" />

      {/* Mountain back-left */}
      <Path d="M86,185 L138,105 L190,185 Z" fill="#7AAB85" />
      {/* Mountain center */}
      <Path d="M138,185 L200,88 L262,185 Z" fill="url(#hills)" />
      {/* Mountain right */}
      <Path d="M218,185 L268,118 L294,185 Z" fill="#6A9B72" />
      {/* Snow caps */}
      <Path d="M196,100 L200,88 L204,100 Z" fill="white" opacity="0.9" />
      <Path d="M136,116 L138,105 L141,116 Z" fill="white" opacity="0.7" />

      {/* Ground / meadow */}
      <Rect x="86" y="180" width="208" height="94" rx="0" fill="#4A7055" />
      <Path d="M86,180 Q150,170 190,178 Q230,186 294,174 L294,185 L86,185 Z" fill="#5A8A65" />

      {/* Trees left */}
      <Rect x="100" y="205" width="6" height="28" fill="#2A3B26" />
      <Path d="M90,218 L103,185 L116,218 Z" fill="#2A3B26" />
      <Path d="M92,230 L103,202 L114,230 Z" fill="#3A5530" />

      {/* Trees right */}
      <Rect x="272" y="207" width="6" height="26" fill="#2A3B26" />
      <Path d="M262,220 L275,188 L288,220 Z" fill="#2A3B26" />
      <Path d="M264,232 L275,206 L286,232 Z" fill="#3A5530" />

      {/* ── Bottom border (0.75in equivalent) ── */}
      <Rect x="86" y="274" width="208" height="62" fill="white" />
      {/* Location text stub */}
      <Rect x="108" y="296" rx="2" ry="2" width="164" height="4" fill="#5A5248" opacity="0.35" />
      <Rect x="126" y="308" rx="2" ry="2" width="128" height="3" fill="#5A5248" opacity="0.2" />
    </G>

    {/* ── Hand (holding card from below) ── */}

    {/* Palm base */}
    <Path
      d="M88,365 Q82,342 96,328 L284,328 Q298,342 292,365 Q272,415 190,424 Q108,415 88,365 Z"
      fill="url(#skin)"
    />

    {/* Thumb (left side) */}
    <Path
      d="M88,358 Q60,345 62,318 Q64,300 80,305 Q95,312 100,332 L96,335 Z"
      fill="#F0BC94"
    />
    <Path
      d="M63,320 Q66,308 78,312 Q90,318 96,334"
      stroke="#E8A87C"
      strokeWidth="1.5"
      fill="none"
    />

    {/* Index finger */}
    <Path
      d="M118,330 Q114,292 121,268 Q125,256 133,268 Q140,292 137,330 Z"
      fill="#F0BC94"
    />
    {/* Middle finger */}
    <Path
      d="M144,328 Q140,286 147,260 Q151,246 160,260 Q167,286 163,328 Z"
      fill="#F0BC94"
    />
    {/* Ring finger */}
    <Path
      d="M170,330 Q167,290 173,266 Q177,253 186,266 Q192,290 190,330 Z"
      fill="#F0BC94"
    />
    {/* Pinky */}
    <Path
      d="M196,334 Q194,298 199,276 Q202,265 210,276 Q215,298 214,334 Z"
      fill="#F0BC94"
    />

    {/* Finger crease lines */}
    <Line x1="122" y1="322" x2="134" y2="325" stroke="#E0A87C" strokeWidth="1.2" />
    <Line x1="147" y1="320" x2="160" y2="323" stroke="#E0A87C" strokeWidth="1.2" />
    <Line x1="173" y1="322" x2="186" y2="325" stroke="#E0A87C" strokeWidth="1.2" />
    <Line x1="199" y1="326" x2="210" y2="328" stroke="#E0A87C" strokeWidth="1.2" />

    {/* Subtle palm lines */}
    <Path d="M105,360 Q140,348 175,352 Q210,356 250,348" stroke="#E0A87C" strokeWidth="1" fill="none" opacity="0.5" />
  </Svg>
);
