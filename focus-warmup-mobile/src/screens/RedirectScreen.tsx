import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import ShieldService, { ShieldSession } from '../services/shieldService';
import { DISTRACTING_APPS } from '../data/appList';

interface RedirectScreenProps {
  route: {
    params: {
      sessionId?: string;
      sourceApp?: string;
    };
  };
}

const RedirectScreen: React.FC<RedirectScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { state } = useApp();
  const [session, setSession] = useState<ShieldSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceAppName, setSourceAppName] = useState('');

  useEffect(() => {
    initializeShieldSession();
  }, []);

  const initializeShieldSession = async () => {
    try {
      const shieldService = ShieldService.getInstance();
      
      // Get or create shield session
      let shieldSession: ShieldSession;
      
      if (route.params?.sessionId) {
        // Session was passed from navigation
        const sessions = await shieldService.getShieldSessions();
        shieldSession = sessions.find(s => s.id === route.params.sessionId) || 
          await createNewShieldSession();
      } else {
        // Create new session
        shieldSession = await createNewShieldSession();
      }
      
      setSession(shieldSession);
      setSourceAppName(shieldSession.sourceAppName);
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize shield session:', error);
      Alert.alert('Error', 'Failed to start learning session. Please try again.');
      setLoading(false);
    }
  };

  const createNewShieldSession = async (): Promise<ShieldSession> => {
    const shieldService = ShieldService.getInstance();
    const sourceApp = route.params?.sourceApp || 'unknown';
    return await shieldService.createShieldSession(sourceApp);
  };

  const handleStartLearning = () => {
    if (session) {
      navigation.navigate('Learning' as never, {
        shieldSessionId: session.id,
        sourceApp: session.sourceApp,
        isShieldSession: true
      } as never);
    }
  };

  const handleSkipLearning = async () => {
    if (session) {
      try {
        const shieldService = ShieldService.getInstance();
        await shieldService.completeShieldSession(session.id, false);
        
        Alert.alert(
          'App Remains Blocked',
          `${sourceAppName} will remain blocked until you complete a learning session.`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' as never }],
                });
              }
            }
          ]
        );
      } catch (error) {
        console.error('Failed to skip learning:', error);
        Alert.alert('Error', 'Failed to complete session. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Setting up your learning session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Focus Warmup Shield</Text>
        <Text style={styles.subtitle}>
          Answer a Focus Warmup question to unlock {sourceAppName}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.shieldCard}>
          <Text style={styles.shieldTitle}>App Blocked</Text>
          <Text style={styles.shieldText}>
            You've been using {sourceAppName} for a while. 
            Complete a quick learning session to unlock it and boost your productivity!
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Why Learning Breaks?</Text>
          <Text style={styles.infoText}>
            • Break the cycle of mindless scrolling{'\n'}
            • Learn something new in just 2-3 minutes{'\n'}
            • Build better habits and improve focus{'\n'}
            • Return to your app feeling refreshed
          </Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{state.stats?.popups || 0}</Text>
              <Text style={styles.statLabel}>Learning Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{state.stats?.mcqs || 0}</Text>
              <Text style={styles.statLabel}>Questions Answered</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartLearning}
        >
          <Text style={styles.primaryButtonText}>Start Learning Session</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSkipLearning}
        >
          <Text style={styles.secondaryButtonText}>Keep App Blocked</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#3B82F6',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0F2FE',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  shieldCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shieldTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  shieldText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
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
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actions: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RedirectScreen;
