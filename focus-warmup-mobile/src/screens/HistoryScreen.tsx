import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { LearningEntry } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

const HistoryScreen: React.FC = () => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const filteredHistory = state.learningHistory.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.conversation.some(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesTopic = !selectedTopic || entry.topic === selectedTopic;
    
    return matchesSearch && matchesTopic;
  });

  const topics = [...new Set(state.learningHistory.map(entry => entry.topic))];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderConversation = (conversation: LearningEntry['conversation']) => {
    return conversation.map((message, index) => (
      <View key={index} style={[
        styles.messageContainer,
        message.role === 'assistant' ? styles.assistantMessage : styles.userMessage
      ]}>
        <Text style={styles.messageHeader}>
          {message.role === 'assistant' ? '🤖 AI' : '👤 You'}
        </Text>
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    ));
  };

  const renderHistoryItem = (entry: LearningEntry) => {
    const isExpanded = expandedEntry === entry.id;
    const previewMessages = entry.conversation.slice(0, 2);
    const hasMore = entry.conversation.length > 2;

    return (
      <View key={entry.id} style={styles.historyItem}>
        <View style={styles.itemHeader}>
          <View style={styles.itemMeta}>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{entry.topic}</Text>
            </View>
            <Text style={styles.dateText}>
              {formatDate(entry.timestamp)} at {formatTime(entry.timestamp)}
            </Text>
          </View>
        </View>

        <View style={styles.conversationPreview}>
          {previewMessages.map((message, index) => (
            <View key={index} style={[
              styles.messageContainer,
              message.role === 'assistant' ? styles.assistantMessage : styles.userMessage
            ]}>
              <Text style={styles.messageHeader}>
                {message.role === 'assistant' ? '🤖 AI' : '👤 You'}
              </Text>
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          ))}
        </View>

        {hasMore && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setExpandedEntry(isExpanded ? null : entry.id)}
          >
            <Text style={styles.showMoreText}>
              {isExpanded ? 'Show Less' : `Show More (${entry.conversation.length - 2} additional messages)`}
            </Text>
          </TouchableOpacity>
        )}

        {isExpanded && hasMore && (
          <View style={styles.fullConversation}>
            {entry.conversation.slice(2).map((message, index) => (
              <View key={index} style={[
                styles.messageContainer,
                message.role === 'assistant' ? styles.assistantMessage : styles.userMessage
              ]}>
                <Text style={styles.messageHeader}>
                  {message.role === 'assistant' ? '🤖 AI' : '👤 You'}
                </Text>
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Learning History</Text>
        <Text style={styles.subtitle}>Your journey of knowledge</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedTopic && styles.filterChipActive]}
            onPress={() => setSelectedTopic('')}
          >
            <Text style={[styles.filterChipText, !selectedTopic && styles.filterChipTextActive]}>
              All Topics
            </Text>
          </TouchableOpacity>
          
          {topics.map((topic) => (
            <TouchableOpacity
              key={topic}
              style={[styles.filterChip, selectedTopic === topic && styles.filterChipActive]}
              onPress={() => setSelectedTopic(topic)}
            >
              <Text style={[styles.filterChipText, selectedTopic === topic && styles.filterChipTextActive]}>
                {topic}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.historyContainer}>
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchTerm || selectedTopic ? 'No conversations found' : 'No learning history yet'}
            </Text>
          </View>
        ) : (
          filteredHistory.map(renderHistoryItem)
        )}
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
    backgroundColor: colors.panel,
    padding: spacing.xxl,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  filterContainer: {
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.panel,
  },
  historyContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  historyItem: {
    backgroundColor: colors.panel,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    marginBottom: spacing.md,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  topicBadgeText: {
    color: colors.panel,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  conversationPreview: {
    marginBottom: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    maxWidth: '90%',
  },
  assistantMessage: {
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
  userMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  messageHeader: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  showMoreButton: {
    paddingVertical: spacing.sm,
  },
  showMoreText: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  fullConversation: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default HistoryScreen;
