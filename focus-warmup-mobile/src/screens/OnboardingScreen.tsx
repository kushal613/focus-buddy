import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import AppSelector from '../components/AppSelector';
import { DISTRACTING_APPS } from '../data/appList';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { saveSettings } = useApp();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [topics, setTopics] = useState<string[]>(['General']);
  const [newTopic, setNewTopic] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [customApps, setCustomApps] = useState<string[]>([]);

  const steps = [
    {
      title: 'Welcome to Focus Warmup! 🧠',
      subtitle: 'Break free from mindless scrolling',
      content: 'Focus Warmup helps you transform time-wasting moments into productive learning breaks. When you\'re stuck on distracting apps, we\'ll gently nudge you with quick learning sessions.',
    },
    {
      title: 'What distracts you most?',
      subtitle: 'Add your biggest time-wasters',
      content: 'Tell us which apps or websites you find most distracting. We\'ll show learning popups when you spend too much time on them.',
    },
    {
      title: 'What do you want to learn?',
      subtitle: 'Choose your learning topics',
      content: 'Select topics that interest you. We\'ll create personalized learning sessions to replace your scrolling time.',
    },
  ];

  const handleAddTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
      Keyboard.dismiss();
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    if (topics.length > 1) {
      setTopics(topics.filter(topic => topic !== topicToRemove));
    }
  };

  const handleAppToggle = (appId: string) => {
    setSelectedAppIds(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const handleCustomAppAdd = (appName: string) => {
    if (!customApps.includes(appName)) {
      setCustomApps([...customApps, appName]);
    }
  };

  const handleRemoveCustomApp = (appName: string) => {
    setCustomApps(customApps.filter(app => app !== appName));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      // Get selected app names from IDs
      const selectedAppNames = selectedAppIds.map(id => {
        const app = DISTRACTING_APPS.find(app => app.id === id);
        return app ? app.name : id;
      });
      
      // Combine selected apps with custom apps
      const allApps = [...selectedAppNames, ...customApps];
      
      const settings = {
        topics,
        activeSites: allApps,
        selectedAppIds, // Save the IDs for future reference
        customApps,
        notificationsEnabled: true,
        reminderTime: '09:00',
        dailyGoal: 3,
      };

      await saveSettings(settings);
      await AsyncStorage.setItem('hasLaunched', 'true');
      
      // Set up Screen Time app limits
      try {
        // const screenTimeService = ScreenTimeService.getInstance();
        // await screenTimeService.initialize();
        // await screenTimeService.setupAppLimits(selectedAppIds);
        // Screen Time app limits configured successfully
      } catch (error) {
        console.error('Failed to setup Screen Time limits:', error);
        // Don't block onboarding if Screen Time setup fails
      }
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' as never }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>
              {steps[0].content}
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Smart popup detection on distracting apps</Text>
              <Text style={styles.featureItem}>• Quick 2-3 minute learning sessions</Text>
              <Text style={styles.featureItem}>• Personalized AI tutoring</Text>
              <Text style={styles.featureItem}>• Track your focus improvement</Text>
            </View>
          </View>
        );
      
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>
              {steps[1].content}
            </Text>
            
            <AppSelector
              selectedApps={selectedAppIds}
              onAppToggle={handleAppToggle}
              onCustomAppAdd={handleCustomAppAdd}
            />
            
            {/* Show selected custom apps */}
            {customApps.length > 0 && (
              <View style={styles.customAppsContainer}>
                <Text style={styles.customAppsLabel}>Custom Apps Added:</Text>
                {customApps.map((app, index) => (
                  <View key={index} style={styles.customAppItem}>
                    <Text style={styles.customAppText}>{app}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveCustomApp(app)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>
              {steps[2].content}
            </Text>
            
            <View style={styles.topicsContainer}>
              {topics.map((topic, index) => (
                <View key={index} style={styles.topicItem}>
                  <Text style={styles.topicText}>{topic}</Text>
                  {topics.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveTopic(topic)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            
            <View style={styles.addTopicContainer}>
              <TextInput
                style={styles.topicInput}
                placeholder="Add a new topic..."
                value={newTopic}
                onChangeText={setNewTopic}
                onSubmitEditing={handleAddTopic}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddTopic}
                disabled={!newTopic.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{steps[currentStep].title}</Text>
        <Text style={styles.subtitle}>{steps[currentStep].subtitle}</Text>
      </View>

      <View style={styles.content}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xxl,
    paddingTop: 60,
    backgroundColor: colors.panel,
  },
  title: {
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.textMuted,
  },
  content: {
    flex: 1,
    padding: spacing.xxl,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.sm,
  },
  nextButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  stepContent: {
    flex: 1,
  },
  stepDescription: {
    fontSize: typography.fontSize.lg,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  featureList: {
    marginTop: spacing.lg,
  },
  featureItem: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  topicsContainer: {
    marginBottom: spacing.lg,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  addTopicContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  topicInput: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  removeButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#ef4444', // Red color matching Chrome extension
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  customAppsContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customAppsLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  customAppItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customAppText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default OnboardingScreen;
