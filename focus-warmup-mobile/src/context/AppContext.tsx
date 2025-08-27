import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, LearningEntry, LearningSession } from '../types';

interface AppStats {
  popups: number;
  mcqs: number;
}

interface AppState {
  settings: AppSettings;
  learningHistory: LearningEntry[];
  currentSession: LearningSession | null;
  stats: AppStats;
  isLoading: boolean;
}

type AppAction =
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LEARNING_HISTORY'; payload: LearningEntry[] }
  | { type: 'ADD_LEARNING_ENTRY'; payload: LearningEntry }
  | { type: 'SET_CURRENT_SESSION'; payload: LearningSession | null }
  | { type: 'UPDATE_STATS'; payload: Partial<AppStats> }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AppState = {
  settings: {
    topics: [],
    activeSites: [],
  },
  learningHistory: [],
  currentSession: null,
  stats: {
    popups: 0,
    mcqs: 0,
  },
  isLoading: true,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LEARNING_HISTORY':
      return { ...state, learningHistory: action.payload };
    case 'ADD_LEARNING_ENTRY':
      return { 
        ...state, 
        learningHistory: [action.payload, ...state.learningHistory] 
      };
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
    case 'UPDATE_STATS':
      return { ...state, stats: { ...state.stats, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveLearningHistory: (history: LearningEntry[]) => Promise<void>;
  loadLearningHistory: () => Promise<void>;
  saveLearningEntry: (entry: LearningEntry) => Promise<void>;
  updateStats: (stats: Partial<AppStats>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const saveSettings = async (settings: AppSettings) => {
    try {
      await AsyncStorage.setItem('fwSettings', JSON.stringify(settings));
      dispatch({ type: 'SET_SETTINGS', payload: settings });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem('fwSettings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveLearningHistory = async (history: LearningEntry[]) => {
    try {
      await AsyncStorage.setItem('fwHistory', JSON.stringify(history));
      dispatch({ type: 'SET_LEARNING_HISTORY', payload: history });
    } catch (error) {
      console.error('Error saving learning history:', error);
    }
  };

  const loadLearningHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('fwHistory');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        dispatch({ type: 'SET_LEARNING_HISTORY', payload: history });
      }
    } catch (error) {
      console.error('Error loading learning history:', error);
    }
  };

  const saveLearningEntry = async (entry: LearningEntry) => {
    try {
      const newHistory = [entry, ...state.learningHistory];
      await AsyncStorage.setItem('fwHistory', JSON.stringify(newHistory));
      dispatch({ type: 'ADD_LEARNING_ENTRY', payload: entry });
    } catch (error) {
      console.error('Error saving learning entry:', error);
    }
  };

  const updateStats = (stats: Partial<AppStats>) => {
    dispatch({ type: 'UPDATE_STATS', payload: stats });
  };

  useEffect(() => {
    const initializeApp = async () => {
      await Promise.all([loadSettings(), loadLearningHistory()]);
      dispatch({ type: 'SET_LOADING', payload: false });
    };
    initializeApp();
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    saveSettings,
    loadSettings,
    saveLearningHistory,
    loadLearningHistory,
    saveLearningEntry,
    updateStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
