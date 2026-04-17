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
  width: number;
  height: number;
  preserveAspectRatio?: string;
}

export const FilteredImage = ({
  uri,
  filter,
  brightness,
  width,
  height,
  preserveAspectRatio = 'xMidYMid meet',
}: FilteredImageProps) => {
  const filterId = `f-${filter}`;
  const hasColorFilter = filter !== 'original';

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
            <Filter
              id={filterId}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
            >
              {filter === 'mono' && (
                <FeColorMatrix
                  type="matrix"
                  values={FILTER_MATRICES.grayscale}
                />
              )}
              {filter === 'sepia' && (
                <FeColorMatrix
                  type="matrix"
                  values={FILTER_MATRICES.sepia80}
                />
              )}
              {filter === 'warm' && (
                <FeColorMatrix type="saturate" values="1.4" />
              )}
              {filter === 'cool' && (
                <FeColorMatrix type="saturate" values="0.9" />
              )}
              {filter === 'pastel' && (
                <FeColorMatrix type="saturate" values="0.7" />
              )}
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
