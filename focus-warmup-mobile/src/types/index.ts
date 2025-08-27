export interface LearningEntry {
  id: string;
  timestamp: number;
  topic: string;
  conversation: ConversationMessage[];
  site?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AppSettings {
  topics: string[];
  activeSites: string[];
  selectedAppIds?: string[]; // For tracking selected app IDs
  customApps?: string[]; // For tracking custom app names
  notificationsEnabled: boolean;
  reminderTime: string;
  dailyGoal: number;
  timers: {
    startingBreakMinutes: number;
    decrementMinutes: number;
    minimumBreakMinutes: number;
  };
}

export interface MCQData {
  question: string;
  options: MCQOption[];
}

export interface MCQOption {
  letter: string;
  text: string;
}

export interface MCQResult {
  correct: boolean;
  feedback: string;
  correctAnswer?: string;
}

export interface LearningSession {
  currentTopic: string;
  currentConversation: ConversationMessage[];
  teachCount: number;
  quizCount: number;
  hasAnsweredMCQCorrectly: boolean;
  lastContinuationConcept?: string;
}

export interface RootStackParamList {
  Onboarding: undefined;
  Main: undefined;
  Learning: {
    topic?: string;
    shieldSessionId?: string;
    sourceApp?: string;
    isShieldSession?: boolean;
  };
  Redirect: {
    sessionId?: string;
    sourceApp?: string;
  };
}

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};
