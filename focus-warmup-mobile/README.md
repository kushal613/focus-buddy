# Focus Warmup Mobile App

A React Native mobile app that transforms mindless phone scrolling into productive learning breaks. Built with Expo and TypeScript.

## Features

### 🧠 Smart Learning Sessions
- **AI-Powered Tutoring**: Personalized learning sessions with GPT-4
- **Interactive Quizzes**: Test your knowledge with multiple-choice questions
- **Topic Rotation**: Automatically rotates through your selected topics
- **Learning Continuity**: Builds on previous sessions for deeper understanding

### 📱 Mobile-First Design
- **Native iOS Experience**: Optimized for iPhone with smooth animations
- **Offline Capable**: Works without internet for basic functionality
- **Push Notifications**: Daily reminders to take learning breaks
- **Dark Mode Ready**: Adapts to system appearance settings

### 📊 Progress Tracking
- **Learning History**: Complete conversation history with search and filters
- **Daily Goals**: Set and track your daily learning targets
- **Progress Stats**: Visual progress indicators and streaks
- **Topic Analytics**: See which topics you're learning most

### ⚙️ Customization
- **Topic Management**: Add/remove learning topics
- **Daily Goals**: Customize your learning targets
- **Notification Settings**: Control reminder timing and frequency
- **Data Privacy**: Clear learning history when needed

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Context + useReducer
- **Storage**: AsyncStorage for local data
- **Notifications**: Expo Notifications
- **AI Integration**: Custom API service layer

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or physical iPhone device
- Expo Go app (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd focus-warmup-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on iOS**
   ```bash
   npm run ios
   ```

### Backend Setup

The mobile app requires the same backend servers as the Chrome extension:

1. **Start the AI API server** (port 3131)
   ```bash
   cd ../focus-warmup-api
   npm run dev
   ```

2. **Start the MCQ evaluation server** (port 3132)
   ```bash
   cd ../pdf-ai-backend
   npm start
   ```

3. **Configure API endpoints** in `src/services/aiService.ts` if needed

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React Context for state management
├── screens/            # Main app screens
│   ├── HomeScreen.tsx
│   ├── LearningScreen.tsx
│   ├── HistoryScreen.tsx
│   ├── SettingsScreen.tsx
│   └── OnboardingScreen.tsx
├── services/           # API and external services
│   └── aiService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── utils/              # Utility functions
    └── notifications.ts
```

## Key Components

### LearningScreen
The core learning interface that handles:
- AI conversation flow
- MCQ generation and evaluation
- User question handling
- Session state management

### AppContext
Global state management for:
- User settings and preferences
- Learning history
- Current session state
- Data persistence

### AIService
API integration layer for:
- Chat completions
- MCQ generation
- Answer evaluation
- Error handling

## Configuration

### Environment Variables
Create a `.env` file in the root directory:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3131
EXPO_PUBLIC_MCQ_BASE_URL=http://localhost:3132
```

### iOS Permissions
The app requires the following permissions:
- **Notifications**: For learning reminders
- **Network**: For AI API communication
- **Storage**: For local data persistence

## Development

### Code Style
- Use TypeScript for all new code
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error handling

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Building for Production

1. **Configure app.json** with your app details
2. **Build for iOS**
   ```bash
   expo build:ios
   ```

3. **Submit to App Store**
   ```bash
   expo submit:ios
   ```

## Deployment

### Expo Application Services (EAS)

1. **Install EAS CLI**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Configure EAS**
   ```bash
   eas build:configure
   ```

3. **Build for production**
   ```bash
   eas build --platform ios
   ```

## Cross-Platform Sync

The mobile app is designed to work alongside the Chrome extension:

- **Shared Backend**: Both apps use the same AI services
- **Data Portability**: Learning history can be exported/imported
- **Consistent Experience**: Same learning flow and UI patterns
- **Topic Synchronization**: Shared topic preferences

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## Roadmap

- [ ] Android support
- [ ] Offline learning mode
- [ ] Social features (sharing progress)
- [ ] Advanced analytics
- [ ] Voice interaction
- [ ] AR learning experiences
