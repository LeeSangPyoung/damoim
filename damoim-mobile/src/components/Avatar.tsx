import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
}

// 디자인 샘플처럼 다양한 파스텔 색상
const AVATAR_COLORS = [
  '#FFE99A', // 노랑
  '#B8E6B8', // 연두
  '#FFD0D0', // 핑크
  '#C5CAE9', // 보라
  '#F8BBD0', // 장미
  '#B3D4FC', // 하늘
  '#FFCCBC', // 살구
  '#D1C4E9', // 라벤더
];

function getAvatarColor(name?: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Avatar({ uri, name, size = 40, online }: AvatarProps) {
  const initial = name ? name.charAt(0) : '?';
  const fontSize = size * 0.4;
  const bgColor = getAvatarColor(name);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
          <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
        </View>
      )}
      {online !== undefined && (
        <View style={[styles.onlineDot, { backgroundColor: online ? '#22c55e' : '#9ca3af' }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  image: { resizeMode: 'cover' },
  placeholder: {
    backgroundColor: '#FFE99A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5D4037',
  },
  initial: {
    color: '#5D4037',
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
