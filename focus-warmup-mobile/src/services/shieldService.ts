import AsyncStorage from '@react-native-async-storage/async-storage';
import { DISTRACTING_APPS } from '../data/appList';

export interface ShieldSession {
  id: string;
  sourceApp: string;
  sourceAppName: string;
  startTime: number;
  completed: boolean;
  learningSessionId?: string;
  quizCompleted: boolean;
}

export interface AppBlock {
  bundleId: string;
  appName: string;
  isBlocked: boolean;
  blockTime: number;
}

class ShieldService {
  private static instance: ShieldService;
  private isInitialized = false;

  static getInstance(): ShieldService {
    if (!ShieldService.instance) {
      ShieldService.instance = new ShieldService();
    }
    return ShieldService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // In a real implementation, this would:
      // - Request FamilyControls authorization
      // - Set up DeviceActivityMonitor
      // - Configure shield appearance
      console.log('Shield service initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize shield service:', error);
      throw error;
    }
  }

  async blockApp(bundleId: string): Promise<void> {
    try {
      const app = DISTRACTING_APPS.find(app => app.bundleId === bundleId);
      const appName = app?.name || 'Unknown App';

      // In a real implementation, this would:
      // - Use ManagedSettingsStore to block the app
      // - Show the shield with our custom message
      // - Set up deep link handling
      
      const block: AppBlock = {
        bundleId,
        appName,
        isBlocked: true,
        blockTime: Date.now()
      };

      await this.saveAppBlock(block);
      console.log(`Blocked app: ${appName} (${bundleId})`);
    } catch (error) {
      console.error('Failed to block app:', error);
      throw error;
    }
  }

  async unblockApp(bundleId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // - Use ManagedSettingsStore to unblock the app
      // - Remove the shield
      // - Allow user to return to the app

      const block: AppBlock = {
        bundleId,
        appName: '',
        isBlocked: false,
        blockTime: 0
      };

      await this.saveAppBlock(block);
      console.log(`Unblocked app: ${bundleId}`);
    } catch (error) {
      console.error('Failed to unblock app:', error);
      throw error;
    }
  }

  async createShieldSession(sourceApp: string): Promise<ShieldSession> {
    try {
      const app = DISTRACTING_APPS.find(app => app.bundleId === sourceApp);
      const appName = app?.name || 'Unknown App';

      const session: ShieldSession = {
        id: `shield_${Date.now()}`,
        sourceApp,
        sourceAppName: appName,
        startTime: Date.now(),
        completed: false,
        quizCompleted: false
      };

      await this.saveShieldSession(session);
      console.log('Shield session created:', session);
      return session;
    } catch (error) {
      console.error('Failed to create shield session:', error);
      throw error;
    }
  }

  async completeShieldSession(sessionId: string, quizCompleted: boolean, learningSessionId?: string): Promise<void> {
    try {
      const session = await this.getShieldSession(sessionId);
      if (session) {
        session.completed = true;
        session.quizCompleted = quizCompleted;
        session.learningSessionId = learningSessionId;
        
        await this.saveShieldSession(session);

        if (quizCompleted) {
          // Unblock the app if quiz was completed
          await this.unblockApp(session.sourceApp);
        } else {
          // Keep app blocked if quiz was not completed
          console.log(`App ${session.sourceAppName} remains blocked - quiz not completed`);
        }

        console.log('Shield session completed:', session);
      }
    } catch (error) {
      console.error('Failed to complete shield session:', error);
      throw error;
    }
  }

  async getActiveShieldSession(): Promise<ShieldSession | null> {
    try {
      const sessions = await this.getShieldSessions();
      return sessions.find(s => !s.completed) || null;
    } catch (error) {
      console.error('Failed to get active shield session:', error);
      return null;
    }
  }

  async getShieldSessions(): Promise<ShieldSession[]> {
    try {
      const sessionsJson = await AsyncStorage.getItem('shieldSessions');
      return sessionsJson ? JSON.parse(sessionsJson) : [];
    } catch (error) {
      console.error('Failed to get shield sessions:', error);
      return [];
    }
  }

  async getAppBlocks(): Promise<AppBlock[]> {
    try {
      const blocksJson = await AsyncStorage.getItem('appBlocks');
      return blocksJson ? JSON.parse(blocksJson) : [];
    } catch (error) {
      console.error('Failed to get app blocks:', error);
      return [];
    }
  }

  async isAppBlocked(bundleId: string): Promise<boolean> {
    try {
      const blocks = await this.getAppBlocks();
      const block = blocks.find(b => b.bundleId === bundleId);
      return block?.isBlocked || false;
    } catch (error) {
      console.error('Failed to check if app is blocked:', error);
      return false;
    }
  }

  // Shield overlay management
  async showShieldOverlay(appName: string): Promise<ShieldSession> {
    try {
      // Create a shield session for this app
      const app = DISTRACTING_APPS.find(app => app.name === appName);
      const bundleId = app?.bundleId || appName;
      
      const session = await this.createShieldSession(bundleId);
      
      // In a real implementation, this would show the iOS system shield
      // For now, we'll use our custom overlay component
      console.log(`Showing shield overlay for ${appName}`);
      
      return session;
    } catch (error) {
      console.error('Failed to show shield overlay:', error);
      throw error;
    }
  }

  async handleShieldLearnAction(sessionId: string): Promise<void> {
    try {
      // This will be called when user taps "Learn" on the shield
      // It should open our app with the learning session
      console.log(`User chose to learn for session ${sessionId}`);
      
      // In a real implementation, this would:
      // - Open our app via deep link
      // - Navigate to learning screen
      // - Pass the session ID for tracking
    } catch (error) {
      console.error('Failed to handle shield learn action:', error);
      throw error;
    }
  }

  async handleShieldExitAction(sessionId: string): Promise<void> {
    try {
      // This will be called when user taps "Exit" on the shield
      // The app should remain blocked
      console.log(`User chose to exit for session ${sessionId}`);
      
      // In a real implementation, this would:
      // - Keep the app blocked
      // - Show the shield again when user tries to access the app
    } catch (error) {
      console.error('Failed to handle shield exit action:', error);
      throw error;
    }
  }

  private async saveShieldSession(session: ShieldSession): Promise<void> {
    try {
      const sessions = await this.getShieldSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      await AsyncStorage.setItem('shieldSessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save shield session:', error);
      throw error;
    }
  }

  private async getShieldSession(sessionId: string): Promise<ShieldSession | null> {
    try {
      const sessions = await this.getShieldSessions();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('Failed to get shield session:', error);
      return null;
    }
  }

  private async saveAppBlock(block: AppBlock): Promise<void> {
    try {
      const blocks = await this.getAppBlocks();
      const existingIndex = blocks.findIndex(b => b.bundleId === block.bundleId);
      
      if (existingIndex >= 0) {
        blocks[existingIndex] = block;
      } else {
        blocks.push(block);
      }
      
      await AsyncStorage.setItem('appBlocks', JSON.stringify(blocks));
    } catch (error) {
      console.error('Failed to save app block:', error);
      throw error;
    }
  }

  // Shield UI configuration
  getShieldConfig() {
    return {
      title: "Answer a Focus Warmup question to unlock TikTok",
      subtitle: "Take a quick learning break to boost your productivity",
      buttonText: "Start Learning",
      deepLinkScheme: "focuswarmup://shield",
      backgroundColor: "#3B82F6",
      textColor: "#FFFFFF"
    };
  }
}

export default ShieldService;
