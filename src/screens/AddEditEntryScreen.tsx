import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../constants/theme';
import type { AddEditEntryScreenProps } from '../navigation/types';

export default function AddEditEntryScreen({ route }: AddEditEntryScreenProps) {
  const entryId = route.params?.entryId;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{entryId ? 'Edit Refuel' : 'Log Refuel'}</Text>
      <Text style={styles.subtitle}>Form lands here in Phase 2.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
