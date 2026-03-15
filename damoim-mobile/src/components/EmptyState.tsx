import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface EmptyStateProps {
  icon?: string;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, ionIcon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {ionIcon ? (
        <Ionicons name={ionIcon} size={56} color={Colors.gray400} style={styles.ionIcon} />
      ) : (
        <Text style={styles.icon}>{icon || '📭'}</Text>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  ionIcon: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.gray600, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.gray400, textAlign: 'center' },
});
