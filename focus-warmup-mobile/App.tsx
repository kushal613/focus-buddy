import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import LearningScreen from './src/screens/LearningScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import FullSetupScreen from './src/screens/FullSetupScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import RedirectScreen from './src/screens/RedirectScreen';
import { AppProvider } from './src/context/AppContext';
import { ShieldProvider } from './src/context/ShieldContext';
import ShieldContainer from './src/components/ShieldContainer';
import { setupNotifications } from './src/utils/notifications';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 20, // Add padding to avoid home indicator
          paddingTop: 8,
          height: 80, // Increase height to accommodate padding
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={FullSetupScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
    setupNotifications();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      setIsFirstLaunch(hasLaunched === null);
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(true);
    }
  };

  if (isFirstLaunch === null) {
    return null; // Loading state
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <ShieldProvider>
          <ShieldContainer>
            <NavigationContainer>
              <StatusBar style="auto" />
              <Stack.Navigator
                initialRouteName={isFirstLaunch ? 'Onboarding' : 'Main'}
                screenOptions={{
                  headerShown: false,
                }}
              >
                {isFirstLaunch && (
                  <Stack.Screen 
                    name="Onboarding" 
                    component={OnboardingScreen}
                  />
                )}
                <Stack.Screen 
                  name="Main" 
                  component={MainTabs}
                />
                <Stack.Screen 
                  name="Learning" 
                  component={LearningScreen}
                  options={{ 
                    headerShown: true,
                    title: 'Learning Session',
                    headerStyle: {
                      backgroundColor: '#3b82f6',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                  }}
                />
                <Stack.Screen 
                  name="Redirect" 
                  component={RedirectScreen}
                  options={{ headerShown: false }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </ShieldContainer>
        </ShieldProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
