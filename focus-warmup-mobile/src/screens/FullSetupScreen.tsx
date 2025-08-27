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
import { useApp } from '../context/AppContext';
import AppSelector from '../components/AppSelector';
import { DISTRACTING_APPS } from '../data/appList';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

const FullSetupScreen: React.FC = () => {
  const { state, saveSettings } = useApp();
  
  const [topics, setTopics] = useState(state.settings.topics.filter(topic => topic !== 'General'));
  const [newTopic, setNewTopic] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState(state.settings.selectedAppIds || []);
  const [customApps, setCustomApps] = useState(state.settings.customApps || []);
  const [startingBreak, setStartingBreak] = useState('5');
  const [decrement, setDecrement] = useState('1');
  const [minimumBreak, setMinimumBreak] = useState('2');

  const handleAddTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      const updatedTopics = [...topics, newTopic.trim()];
      setTopics(updatedTopics);
      setNewTopic('');
      updateSettings({ topics: updatedTopics });
      Keyboard.dismiss(); // Dismiss keyboard after adding topic
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    const updatedTopics = topics.filter(topic => topic !== topicToRemove);
    setTopics(updatedTopics);
    updateSettings({ topics: updatedTopics });
  };

  const handleAppToggle = (appId: string) => {
    const updatedAppIds = selectedAppIds.includes(appId)
      ? selectedAppIds.filter(id => id !== appId)
      : [...selectedAppIds, appId];
    
    setSelectedAppIds(updatedAppIds);
    
    // Update activeSites with app names
    const selectedAppNames = updatedAppIds.map(id => {
      const app = DISTRACTING_APPS.find(app => app.id === id);
      return app ? app.name : id;
    });
    const allApps = [...selectedAppNames, ...customApps];
    
    updateSettings({ 
      selectedAppIds: updatedAppIds,
      activeSites: allApps 
    });
    
    // Update Screen Time limits
    updateScreenTimeLimits(updatedAppIds);
  };

  const handleCustomAppAdd = (appName: string) => {
    if (!customApps.includes(appName)) {
      const updatedCustomApps = [...customApps, appName];
      setCustomApps(updatedCustomApps);
      
      // Update activeSites with app names
      const selectedAppNames = selectedAppIds.map(id => {
        const app = DISTRACTING_APPS.find(app => app.id === id);
        return app ? app.name : id;
      });
      const allApps = [...selectedAppNames, ...updatedCustomApps];
      
      updateSettings({ 
        customApps: updatedCustomApps,
        activeSites: allApps 
      });
    }
  };

  const handleRemoveCustomApp = (appName: string) => {
    const updatedCustomApps = customApps.filter(app => app !== appName);
    setCustomApps(updatedCustomApps);
    
    // Update activeSites with app names
    const selectedAppNames = selectedAppIds.map(id => {
      const app = DISTRACTING_APPS.find(app => app.id === id);
      return app ? app.name : id;
    });
    const allApps = [...selectedAppNames, ...updatedCustomApps];
    
    updateSettings({ 
      customApps: updatedCustomApps,
      activeSites: allApps 
    });
  };

  const updateScreenTimeLimits = async (appIds: string[]) => {
    try {
      // This function is no longer needed as we are using shieldService directly.
      // Keeping it for now in case it's called elsewhere or for future use.
      // Screen Time limits update triggered for apps: appIds
    } catch (error) {
      console.error('Failed to update Screen Time limits:', error);
    }
  };

  const updateSettings = async (updates: Partial<typeof state.settings>) => {
    try {
      const newSettings = { ...state.settings, ...updates };
      await saveSettings(newSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onTouchStart={Keyboard.dismiss}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distracting Apps & Sites</Text>
          <Text style={styles.sectionDescription}>
            Add the apps and websites that distract you most. We'll show learning popups when you spend time on them.
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Topics</Text>
          <Text style={styles.sectionDescription}>
            Choose topics you want to learn about during your focus breaks.
          </Text>
          
          <View style={styles.topicsContainer}>
            {topics.map((topic, index) => (
              <View key={index} style={styles.topicItem}>
                <Text style={styles.topicText}>{topic}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveTopic(topic)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timer Settings</Text>
          <Text style={styles.sectionDescription}>
            Configure how long your focus breaks should be.
          </Text>
          
          <View style={styles.timerGrid}>
            <View style={styles.timerItem}>
              <Text style={styles.timerLabel}>Starting Break (minutes)</Text>
              <TextInput
                style={styles.timerInput}
                value={startingBreak}
                onChangeText={setStartingBreak}
                keyboardType="numeric"
                placeholder="5"
              />
            </View>
            
            <View style={styles.timerItem}>
              <Text style={styles.timerLabel}>Decrement (minutes)</Text>
              <TextInput
                style={styles.timerInput}
                value={decrement}
                onChangeText={setDecrement}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
            
            <View style={styles.timerItem}>
              <Text style={styles.timerLabel}>Minimum Break (minutes)</Text>
              <TextInput
                style={styles.timerInput}
                value={minimumBreak}
                onChangeText={setMinimumBreak}
                keyboardType="numeric"
                placeholder="2"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  section: {
    backgroundColor: colors.panel,
    marginBottom: spacing.lg,
    padding: spacing.xxl,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
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
  timerGrid: {
    gap: spacing.lg,
  },
  timerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerLabel: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  timerInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    width: 80,
  },
  customAppsContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
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

export default FullSetupScreen;
