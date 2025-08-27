import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

interface ShieldOverlayProps {
  appName: string;
  onLearn: () => void;
  onExit: () => void;
}

const { width, height } = Dimensions.get('window');

const ShieldOverlay: React.FC<ShieldOverlayProps> = ({
  appName,
  onLearn,
  onExit,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.shieldCard}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🧠</Text>
          </View>
          
          <Text style={styles.title}>Hey, it's your Focus buddy!</Text>
          
          <Text style={styles.message}>
            Time to learn! You've been on {appName} for a while. 
            Take a quick brain break with some learning.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.learnButton}
              onPress={onLearn}
            >
              <Text style={styles.learnButtonText}>Learn</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.exitButton}
              onPress={onExit}
            >
              <Text style={styles.exitButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.footer}>
            Complete a learning session to unlock {appName}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 9999,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  shieldCard: {
    backgroundColor: colors.panel,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  learnButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  learnButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  exitButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 120,
    alignItems: 'center',
  },
  exitButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ShieldOverlay;
