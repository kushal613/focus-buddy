import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ShieldSession } from '../services/shieldService';

interface ShieldContextType {
  isShieldVisible: boolean;
  currentShieldSession: ShieldSession | null;
  showShield: (appName: string) => Promise<void>;
  hideShield: () => void;
  handleLearnAction: () => void;
  handleExitAction: () => void;
}

const ShieldContext = createContext<ShieldContextType | undefined>(undefined);

export const useShield = () => {
  const context = useContext(ShieldContext);
  if (context === undefined) {
    throw new Error('useShield must be used within a ShieldProvider');
  }
  return context;
};

interface ShieldProviderProps {
  children: ReactNode;
}

export const ShieldProvider: React.FC<ShieldProviderProps> = ({ children }) => {
  const [isShieldVisible, setIsShieldVisible] = useState(false);
  const [currentShieldSession, setCurrentShieldSession] = useState<ShieldSession | null>(null);

  const showShield = async (appName: string) => {
    try {
      // In a real implementation, this would integrate with iOS Screen Time APIs
      // For now, we'll simulate the shield behavior
      const mockSession: ShieldSession = {
        id: `shield_${Date.now()}`,
        sourceApp: appName,
        sourceAppName: appName,
        startTime: Date.now(),
        completed: false,
        quizCompleted: false,
      };
      
      setCurrentShieldSession(mockSession);
      setIsShieldVisible(true);
      
      console.log(`Shield shown for ${appName}`);
    } catch (error) {
      console.error('Failed to show shield:', error);
    }
  };

  const hideShield = () => {
    setIsShieldVisible(false);
    setCurrentShieldSession(null);
  };

  const handleLearnAction = () => {
    // This will be handled by the ShieldOverlay component
    // It should navigate to the learning screen
    console.log('User chose to learn');
    hideShield();
  };

  const handleExitAction = () => {
    // User chose to exit - keep the app blocked
    console.log('User chose to exit');
    hideShield();
  };

  const value: ShieldContextType = {
    isShieldVisible,
    currentShieldSession,
    showShield,
    hideShield,
    handleLearnAction,
    handleExitAction,
  };

  return (
    <ShieldContext.Provider value={value}>
      {children}
    </ShieldContext.Provider>
  );
};
