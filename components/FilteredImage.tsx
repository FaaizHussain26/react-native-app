import React from 'react';
import { View } from 'react-native';
import Svg, {
  Image as SvgImage,
  Filter,
  FeColorMatrix,
  Defs,
} from 'react-native-svg';
import { FilterType, FILTER_MATRICES } from '../constants/theme';

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

// Matches the per-filter behavior of the original, proven-working implementation.
const namedFilterMatrix = (filter: FilterType): ColorMatrix | null => {
  switch (filter) {
    case 'mono':
      return FILTER_MATRICES.grayscale.split(/\s+/).map(Number);
    case 'sepia':
      return FILTER_MATRICES.sepia80.split(/\s+/).map(Number);
    case 'warm':
      return saturateMatrix(1.4);
    case 'cool':
      return saturateMatrix(0.9);
    case 'pastel':
      return saturateMatrix(0.7);
    default:
      return null;
  }
};

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
