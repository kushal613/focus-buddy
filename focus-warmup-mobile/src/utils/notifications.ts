import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const setupNotifications = async () => {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
};

export const scheduleLearningReminder = async (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time for Focus Warmup! 🧠",
      body: "Take a quick learning break to boost your productivity.",
      data: { type: 'learning_reminder' },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const sendImmediateNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: null, // Send immediately
  });
};
