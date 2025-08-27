import React from 'react';
import { View } from 'react-native';
import { useShield } from '../context/ShieldContext';
import ShieldOverlay from './ShieldOverlay';

interface ShieldContainerProps {
  children: React.ReactNode;
}

const ShieldContainer: React.FC<ShieldContainerProps> = ({ children }) => {
  const { isShieldVisible, currentShieldSession, handleLearnAction, handleExitAction } = useShield();

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      {isShieldVisible && currentShieldSession && (
        <ShieldOverlay
          appName={currentShieldSession.sourceAppName}
          onLearn={handleLearnAction}
          onExit={handleExitAction}
        />
      )}
    </View>
  );
};

export default ShieldContainer;
