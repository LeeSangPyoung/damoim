import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '../constants/colors';

interface BadgeProps {
  count: number;
  size?: number;
}

export default function Badge({ count, size = 18 }: BadgeProps) {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);
  return (
    <View style={[styles.badge, { minWidth: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.55 }]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
});
