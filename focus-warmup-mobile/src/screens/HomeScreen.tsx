import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { useShield } from '../context/ShieldContext';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

const HomeScreen: React.FC = () => {
  const { state } = useApp();
  const { showShield } = useShield();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Focus Warmup</Text>
        <Text style={styles.subtitle}>From distraction to deep work</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Today's Focus Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{state.stats.popups}</Text>
              <Text style={styles.statLabel}>Popups</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{state.stats.mcqs}</Text>
              <Text style={styles.statLabel}>MCQs</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            When you spend time on distracting apps, we'll gently redirect you to complete a quick learning session before you can continue.
          </Text>
        </View>

        <TouchableOpacity onPress={showShield} style={styles.testButton}>
          <Text style={styles.testButtonText}>Show Shield</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.panel,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: '#E0F2FE',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.xxl,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  statsContainer: {
    backgroundColor: colors.panel,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  infoCard: {
    backgroundColor: colors.panel,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    lineHeight: 22,
  },
  distractingAppsSection: {
    backgroundColor: colors.panel,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  appsList: {
    gap: spacing.sm,
  },
  appItem: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appName: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  moreApps: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  noAppsText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  testButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  testButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
});

export default HomeScreen;
