import React from 'react';
import { View, Image } from 'react-native';
import { FilterType, FILTER_CSS } from '../constants/theme';

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
  const colorFilter = FILTER_CSS[filter] ?? '';
  const brightnessFilter = brightness !== 100 ? `brightness(${brightness}%)` : '';
  const filterStyle = [brightnessFilter, colorFilter].filter(Boolean).join(' ');

  // 'xMidYMid meet' = contain, 'xMidYMid slice' = cover
  const resizeMode = preserveAspectRatio === 'xMidYMid slice' ? 'cover' : 'contain';

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image
        source={{ uri }}
        style={[
          { width, height },
          filterStyle ? ({ filter: filterStyle } as any) : undefined,
        ]}
        resizeMode={resizeMode}
      />
    </View>
  );
};
