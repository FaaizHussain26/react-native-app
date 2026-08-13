import React from 'react';
import { View } from 'react-native';
import Svg, {
  Image as SvgImage,
  Filter,
  FeColorMatrix,
  Defs,
} from 'react-native-svg';
import { FilterType, FILTER_CSS } from '../constants/theme';

interface FilteredImageProps {
  uri: string;
  filter: FilterType;
  brightness: number;
  contrast?: number;
  saturation?: number;
  warmth?: number;
  width: number;
  height: number;
  preserveAspectRatio?: string;
}

// A 4x5 affine color matrix (20 numbers, row-major), same format `react-native-svg`'s
// <FeColorMatrix type="matrix"> expects and the same math CSS filter functions use internally.
type ColorMatrix = number[];

const IDENTITY_MATRIX: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

// Composes two 4x5 matrices (as 5x5 homogeneous matrices with an implicit
// [0,0,0,0,1] last row) — applies `b` first, then `a`.
const multiplyColorMatrices = (a: ColorMatrix, b: ColorMatrix): ColorMatrix => {
  const toRows = (m: ColorMatrix) => [
    m.slice(0, 5),
    m.slice(5, 10),
    m.slice(10, 15),
    m.slice(15, 20),
    [0, 0, 0, 0, 1],
  ];
  const A = toRows(a);
  const B = toRows(b);
  const result: number[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      let sum = 0;
      for (let k = 0; k < 5; k++) sum += A[i][k] * B[k][j];
      result.push(sum);
    }
  }
  return result;
};

const contrastMatrix = (percent: number): ColorMatrix => {
  const c = percent / 100;
  const t = 0.5 * (1 - c);
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
  ];
};

const saturateMatrix = (s: number): ColorMatrix => [
  0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0,
  0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0,
  0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0,
  0, 0, 0, 1, 0,
];

const hueRotateMatrix = (deg: number): ColorMatrix => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928, 0, 0,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283, 0, 0,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072, 0, 0,
    0, 0, 0, 1, 0,
  ];
};

const brightnessMatrix = (percent: number): ColorMatrix => {
  const b = percent / 100;
  return [
    b, 0, 0, 0, 0,
    0, b, 0, 0, 0,
    0, 0, b, 0, 0,
    0, 0, 0, 1, 0,
  ];
};

// W3C filter-effects sepia(100%) matrix — sepia(amount%) linearly interpolates
// between the identity matrix and this one, same as the spec's formula.
const SEPIA_MATRIX: ColorMatrix = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0, 0, 0, 1, 0,
];

const sepiaMatrix = (percent: number): ColorMatrix => {
  const amount = percent / 100;
  return IDENTITY_MATRIX.map((v, i) => v * (1 - amount) + SEPIA_MATRIX[i] * amount);
};

// Parses a CSS `filter` string (e.g. "sepia(30%) saturate(160%) hue-rotate(-14deg)")
// and composes the equivalent SVG color matrix using the exact same functions
// CSS applies, in the same left-to-right order — so the on-screen preview can
// never silently drift from FILTER_CSS (the same recipe used for the printed
// postcard) the way a hand-duplicated per-filter matrix could.
const cssFilterStringToMatrix = (css: string): ColorMatrix | null => {
  let matrix: ColorMatrix | null = null;
  const fnRe = /([\w-]+)\(([-\d.]+)(?:%|deg)?\)/g;
  let match: RegExpExecArray | null;
  while ((match = fnRe.exec(css))) {
    const [, fn, rawValue] = match;
    const value = parseFloat(rawValue);
    let m: ColorMatrix | null = null;
    switch (fn) {
      case 'sepia':
        m = sepiaMatrix(value);
        break;
      case 'saturate':
        m = saturateMatrix(value / 100);
        break;
      case 'grayscale':
        // grayscale(amount%) is defined by the same formula as saturate(1 - amount).
        m = saturateMatrix(1 - value / 100);
        break;
      case 'hue-rotate':
        m = hueRotateMatrix(value);
        break;
      case 'brightness':
        m = brightnessMatrix(value);
        break;
      case 'contrast':
        m = contrastMatrix(value);
        break;
      default:
        m = null;
    }
    if (m) matrix = matrix ? multiplyColorMatrices(m, matrix) : m;
  }
  return matrix;
};

const namedFilterMatrix = (filter: FilterType): ColorMatrix | null =>
  cssFilterStringToMatrix(FILTER_CSS[filter] ?? '');

export const FilteredImage = ({
  uri,
  filter,
  brightness,
  contrast = 100,
  saturation = 100,
  warmth = 0,
  width,
  height,
  preserveAspectRatio = 'xMidYMid meet',
}: FilteredImageProps) => {
  const filterId = `f-${filter}-${contrast}-${saturation}-${warmth}`;

  let matrix: ColorMatrix | null = null;
  if (contrast !== 100) matrix = contrastMatrix(contrast);
  if (saturation !== 100) {
    const m = saturateMatrix(saturation / 100);
    matrix = matrix ? multiplyColorMatrices(m, matrix) : m;
  }
  if (warmth !== 0) {
    const m = hueRotateMatrix(warmth);
    matrix = matrix ? multiplyColorMatrices(m, matrix) : m;
  }
  const namedMatrix = namedFilterMatrix(filter);
  if (namedMatrix) {
    matrix = matrix ? multiplyColorMatrices(namedMatrix, matrix) : namedMatrix;
  }

  const hasColorFilter = matrix !== null;

  // Brightness overlay: < 100 darkens (black overlay), > 100 lightens (white overlay)
  const brightnessOffset = brightness - 100; // -50 to +50
  const overlayOpacity = Math.abs(brightnessOffset) / 100; // 0 to 0.5
  const overlayColor = brightnessOffset < 0 ? '#000000' : '#FFFFFF';
  const showOverlay = Math.abs(brightnessOffset) > 1;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {hasColorFilter && (
          <Defs>
            <Filter id={filterId} x="0%" y="0%" width="100%" height="100%">
              <FeColorMatrix type="matrix" values={(matrix ?? IDENTITY_MATRIX).join(' ')} />
            </Filter>
          </Defs>
        )}
        <SvgImage
          href={uri}
          width={width}
          height={height}
          filter={hasColorFilter ? `url(#${filterId})` : undefined}
          preserveAspectRatio={preserveAspectRatio}
        />
      </Svg>

      {/* Brightness overlay */}
      {showOverlay && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />
      )}
    </View>
  );
};
