import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/aiService';
import ShieldService from '../services/shieldService';
import { DISTRACTING_APPS } from '../data/appList';
import { MCQData } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

interface LearningScreenProps {
  route: {
    params: {
      shieldSessionId?: string;
      sourceApp?: string;
      isShieldSession?: boolean;
    };
  };
}

const LearningScreen: React.FC<LearningScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { state, saveLearningEntry, updateStats } = useApp();
  const [conversation, setConversation] = useState<Array<{role: string, content: string}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  const [mcqData, setMcqData] = useState<MCQData | null>(null);
  const [awaitingMCQ, setAwaitingMCQ] = useState(false);
  const [hasAnsweredMCQCorrectly, setHasAnsweredMCQCorrectly] = useState(false);
  const [shieldSessionId, setShieldSessionId] = useState<string | null>(null);
  const [sourceAppName, setSourceAppName] = useState('');
  const [isShieldSession, setIsShieldSession] = useState(false);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      // Set up shield session if provided
      if (route.params?.shieldSessionId) {
        setShieldSessionId(route.params.shieldSessionId);
        setSourceAppName(getAppNameFromBundleId(route.params.sourceApp || ''));
        setIsShieldSession(route.params.isShieldSession || false);
      }

      // Initialize Shield service
      const shieldService = ShieldService.getInstance();
      await shieldService.initialize();

      // Start with a teaching message
      await requestTeaching();
    } catch (error) {
      console.error('Failed to initialize learning session:', error);
      Alert.alert('Error', 'Failed to start learning session. Please try again.');
    }
  };

  const getAppNameFromBundleId = (bundleId: string): string => {
    const app = DISTRACTING_APPS.find(app => app.bundleId === bundleId);
    return app?.name || 'distracting app';
  };

  const requestTeaching = async () => {
    setLoading(true);
    try {
      const topic = currentTopic || state.settings.topics[0] || 'General';
      const prompt = conversation.length === 0 
        ? `Teach the user a concept about ${topic}. Keep it concise (2-3 sentences) and engaging. Focus on core fundamentals.`
        : `Teach the user in more detail about ${topic} in continuation of the last concept. Keep it concise (2-3 sentences) and build upon what was just taught.`;

      const response = await aiService.chat(prompt);
      
      const newMessage = { role: 'assistant', content: response };
      setConversation(prev => [...prev, newMessage]);
      setCurrentTopic(topic);
      
      // Update stats
      updateStats({ popups: state.stats.popups + 1 });
      
      // Save learning entry
      await saveLearningEntry({
        topic,
        conversation: [...conversation, newMessage],
        timestamp: Date.now(),
        sourceApp: route.params?.sourceApp || null
      });
      
    } catch (error) {
      console.error('Failed to get teaching:', error);
      Alert.alert('Error', 'Failed to get teaching content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestMCQ = async () => {
    setLoading(true);
    try {
      const topic = currentTopic || state.settings.topics[0] || 'General';
      const mcq = await aiService.generateMCQ(topic, conversation);
      
      if (mcq && mcq.options.length >= 4) {
        setMcqData(mcq);
        setAwaitingMCQ(true);
      } else {
        Alert.alert('Error', 'Failed to generate quiz. Please try again.');
      }
    } catch (error) {
      console.error('Failed to get MCQ:', error);
      Alert.alert('Error', 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMCQAnswer = async (choice: string) => {
    if (!mcqData) return;

    try {
      const result = await aiService.evaluateMCQ(mcqData.question, choice, conversation);
      
      const feedbackMessage = {
        role: 'assistant',
        content: result.correct 
          ? `Correct! ${result.feedback}` 
          : `Incorrect. ${result.feedback}`
      };
      
      setConversation(prev => [...prev, feedbackMessage]);
      setAwaitingMCQ(false);
      setMcqData(null);
      
      if (result.correct) {
        setHasAnsweredMCQCorrectly(true);
        updateStats({ mcqs: state.stats.mcqs + 1 });
        
        // If this is a shield session, complete it and unblock the app
        if (isShieldSession && shieldSessionId) {
          await completeShieldSession(true);
        }
      }
      
      // Save learning entry
      await saveLearningEntry({
        topic: currentTopic,
        conversation: [...conversation, feedbackMessage],
        timestamp: Date.now(),
        sourceApp: route.params?.sourceApp || null
      });
      
    } catch (error) {
      console.error('Failed to evaluate MCQ:', error);
      Alert.alert('Error', 'Failed to evaluate answer. Please try again.');
    }
  };

  const completeShieldSession = async (quizCompleted: boolean) => {
    if (!shieldSessionId) return;

    try {
      const shieldService = ShieldService.getInstance();
      await shieldService.completeShieldSession(shieldSessionId, quizCompleted);
      
      if (quizCompleted) {
        Alert.alert(
          'Quiz Completed! 🎉',
          `${sourceAppName} has been unlocked! You can now return to it.`,
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
      }
    } catch (error) {
      console.error('Failed to complete shield session:', error);
    }
  };

  const handleExit = async () => {
    try {
      // Complete shield session if this was a shield session
      if (isShieldSession && shieldSessionId) {
        await completeShieldSession(false); // Quiz not completed
        
        Alert.alert(
          'Session Incomplete',
          `${sourceAppName} will remain blocked until you complete a quiz correctly.`,
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
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to exit session:', error);
      navigation.goBack();
    }
  };

  const handleAskQuestion = async () => {
    if (!currentMessage.trim()) return;
    
    setLoading(true);
    try {
      const userMessage = { role: 'user', content: currentMessage };
      setConversation(prev => [...prev, userMessage]);
      
      const prompt = `Answer this specific question from the user: "${currentMessage}". Keep your response concise (2-3 sentences, max 50 words).`;
      const response = await aiService.chat(prompt);
      
      const assistantMessage = { role: 'assistant', content: response };
      setConversation(prev => [...prev, assistantMessage]);
      setCurrentMessage('');
      
      // Save learning entry
      await saveLearningEntry({
        topic: currentTopic,
        conversation: [...conversation, userMessage, assistantMessage],
        timestamp: Date.now(),
        sourceApp: route.params?.sourceApp || null
      });
      
    } catch (error) {
      console.error('Failed to ask question:', error);
      Alert.alert('Error', 'Failed to get answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isShieldSession ? `Unlock ${sourceAppName}` : 'Learning Session'}
        </Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>
            {isShieldSession ? 'Keep Blocked' : 'Exit Session'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.conversationContainer} showsVerticalScrollIndicator={false}>
        {conversation.map((message, index) => (
          <View key={index} style={[
            styles.messageContainer,
            message.role === 'user' ? styles.userMessage : styles.assistantMessage
          ]}>
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {awaitingMCQ && mcqData && (
        <View style={styles.mcqContainer}>
          <Text style={styles.mcqQuestion}>{mcqData.question}</Text>
          <View style={styles.mcqOptions}>
            {mcqData.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.mcqOption}
                onPress={() => handleMCQAnswer(option.letter)}
              >
                <Text style={styles.mcqOptionText}>{option.letter}) {option.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!awaitingMCQ && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Ask a question..."
            value={currentMessage}
            onChangeText={setCurrentMessage}
            onSubmitEditing={handleAskQuestion}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.sendButton, !currentMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleAskQuestion}
            disabled={!currentMessage.trim() || loading}
          >
            <Text style={styles.sendButtonText}>Ask</Text>
          </TouchableOpacity>
        </View>
      )}

      {!awaitingMCQ && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={requestTeaching}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Learn More</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={requestMCQ}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Quiz Me</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  exitButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  exitButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  conversationContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  messageContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: colors.panel,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: typography.fontSize.lg,
    color: colors.text,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
  },
  mcqContainer: {
    backgroundColor: colors.panel,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mcqQuestion: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  mcqOptions: {
    gap: spacing.sm,
  },
  mcqOption: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mcqOptionText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButtonTextSecondary: {
    color: colors.textSecondary,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});

export default LearningScreen;
