# D-ID Next.js Live Streaming Demo

A modern Next.js application showcasing D-ID's live streaming capabilities with AI-powered conversation, voice recognition, and dynamic presenter selection.

## ✨ Enhanced Features

- 🎭 **Dynamic Presenter Selection**: Choose from D-ID's presenter library or use custom images
- 🎥 **Real-time Avatar Streaming**: D-ID WebRTC streaming with interactive avatars
- 🎤 **Voice Recognition**: Deepgram Nova-2 speech-to-text transcription  
- 🤖 **AI Chat**: GPT-4o integration for intelligent conversations
- 💬 **Multi-Modal Input**: Support both text and voice interactions
- 🎨 **Modern Glass-morphism UI**: Responsive design with Tailwind CSS v4
- 🔧 **TypeScript**: Fully typed for better development experience
- 🎬 **Interactive Previews**: Hover to see presenter talking previews
- 🔄 **Context-Based Architecture**: Global state management for seamless switching
- 🛡️ **Advanced Error Handling**: Detailed error reporting with fallback systems

## Prerequisites

You'll need API keys for the following services:

- [D-ID](https://www.d-id.com/) - For avatar streaming
- [OpenAI](https://platform.openai.com/) - For GPT-4o chat completions
- [Deepgram](https://deepgram.com/) - For speech-to-text transcription
- [ElevenLabs](https://elevenlabs.io/) - For voice synthesis

## Setup

1. **Clone and navigate to the project**:
   ```bash
   cd d-id-nextjs
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**:
   Copy `.env.local` and update with your API keys:
   ```bash
   # D-ID API Configuration
   NEXT_PUBLIC_DID_API_KEY=your_did_api_key_here
   NEXT_PUBLIC_DID_WEBSOCKET_URL=wss://api.d-id.com
   # Note: DID_SERVICE is now optional - managed by PresenterContext

   # OpenAI API Configuration
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

   # Deepgram API Configuration
   NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_api_key_here

   # ElevenLabs API Configuration
   NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

4. **Add idle videos** (optional):
   Place idle video files in the `public` directory:
   - `emma_idle.mp4` (for talks service)
   - `alex_v2_idle.mp4` (for clips service)

5. **Run the development server**:
   ```bash
   npm run dev
   # or
   bun dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 🚀 Usage

### Basic Interaction
1. **Select Presenter**: Click the presenter icon to choose from available presenters or custom images
2. **Choose Mode**: Toggle between "Clips" (pre-trained presenters) and "Talks" (custom images)
3. **Connect**: Click the "Connect" button to establish a connection to D-ID streaming
4. **Chat**: Type messages in the text input or use voice recording
5. **Voice**: Hold the "Hold to Record" button to capture voice input
6. **Watch**: The avatar will respond with synthesized speech and lip-sync

### Advanced Features
- **Presenter Previews**: Hover over presenters in the selection grid to see talking previews
- **Dynamic Switching**: Change presenters anytime (automatically disconnects and requires reconnection)
- **Error Handling**: Detailed error messages help troubleshoot connection issues
- **Fallback System**: If presenter videos fail to load, local videos automatically serve as backups

## 🏗️ Architecture

The application features a modern, context-driven architecture:

### Context-Based State Management
- `PresenterContext.tsx` - Global presenter state management with automatic disconnect handling

### API Integration
- `/api/presenters/route.ts` - D-ID presenter API proxy with 30-minute caching

### Services
- `deepgramClient.ts` - Speech-to-text transcription
- `openaiClient.ts` - GPT-4o chat completions  
- `didClient.ts` - Enhanced D-ID WebSocket/WebRTC with dynamic presenter support
- `webrtcManager.ts` - WebRTC peer connection handling

### Hooks  
- `useConversation.ts` - Chat history and LLM interactions
- `useVoiceRecording.ts` - Audio capture and transcription
- `useDidStreaming.ts` - Context-aware D-ID connection and video streaming

### Components
- `StreamingChat.tsx` - Main application orchestrator with enhanced error handling
- `PresenterSelector.tsx` - Dynamic presenter selection with API integration
- `VideoDisplay.tsx` - Smart video display with automatic fallback system
- `ChatInterface.tsx` - Text chat with message history
- `VoiceRecorder.tsx` - Voice recording with visual feedback
- `StatusPanel.tsx` - Connection and system status
- `ControlButtons.tsx` - Connect/disconnect controls

## Technical Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better DX
- **Tailwind CSS** - Utility-first styling
- **WebRTC** - Real-time peer-to-peer communication
- **WebSocket** - Real-time messaging with D-ID

## 🛡️ Enhanced Error Handling

The app features comprehensive error handling and debugging:

### Error Display System
- **Categorized Errors**: Separate display for D-ID Streaming, AI, and Voice errors
- **Detailed Information**: Shows connection IDs, request IDs for easier debugging
- **User-Friendly Messages**: Clear, actionable error descriptions

### Debugging Features
- **API Error Parsing**: Extracts detailed error information from D-ID responses
- **Console Logging**: Comprehensive logging for development and troubleshooting
- **Message Tracking**: Full WebSocket message logging with presenter configuration
- **Connection State Monitoring**: Real-time connection status and error tracking

### Fallback Systems
- **Video Fallbacks**: Automatic switching from remote to local videos on load failure
- **API Rate Limiting**: Detection and user notification for API limits
- **Connection Recovery**: Graceful handling of WebSocket/WebRTC disconnections
- **Error Boundaries**: React error boundaries for graceful degradation

## Development

### Project Structure
```
├── app/
│   ├── api/presenters/      # D-ID presenter API proxy with caching
│   ├── globals.css          # Tailwind CSS v4 configuration
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page with PresenterProvider
├── components/
│   ├── PresenterSelector.tsx    # Dynamic presenter selection UI
│   ├── StreamingChat.tsx        # Main orchestrator with error handling
│   ├── VideoDisplay.tsx         # Smart video display with fallbacks
│   └── [other components]       # Chat, voice, status components
├── contexts/
│   └── PresenterContext.tsx     # Global presenter state management
├── hooks/                       # Context-aware custom React hooks
├── services/                    # Enhanced API clients
├── types/                       # Comprehensive TypeScript definitions
├── utils/                       # Configuration and constants
└── public/                      # Static assets and fallback videos
```

### Code Style & Patterns
- **Context-Driven Architecture**: Global state management using React Context
- **Modular Components**: Single-responsibility components with clear interfaces
- **Custom Hooks**: Context-aware hooks for state management
- **TypeScript Safety**: Comprehensive type definitions and strict typing
- **Error-First Design**: Comprehensive error handling and fallback systems
- **Performance Optimized**: API caching, video preloading, efficient re-rendering

### Build Commands
```bash
# Development
bun run dev

# Production build  
bun run build

# Type checking
bun run type-check

# Linting
bun run lint
```

## Troubleshooting

### Common Issues & Solutions

1. **"Internal server error" from D-ID**
   - Check the detailed error display in the UI for connection/request IDs
   - Verify presenter configuration in console logs
   - Ensure selected presenter is valid and streamable
   - Check D-ID API key permissions and quotas

2. **Presenter videos not loading**
   - Videos automatically fallback to local files if remote URLs fail
   - Check console for "Trying fallback local video..." messages
   - Ensure local idle videos exist in `/public` directory

3. **WebRTC Connection Failed**
   - Check firewall settings
   - Ensure HTTPS in production
   - Verify D-ID API key and permissions
   - Check browser console for detailed WebSocket messages

4. **Voice Recording Not Working**
   - Check microphone permissions
   - Ensure HTTPS for getUserMedia
   - Verify Deepgram API key
   - Check browser compatibility

5. **Presenter Selection Issues**
   - Ensure D-ID API key has access to clips/presenters endpoint
   - Check network connectivity for API calls
   - Verify API rate limits haven't been exceeded

### Browser Compatibility

- Chrome/Chromium: Full support
- Firefox: Full support
- Safari: Requires additional WebRTC polyfills
- Mobile browsers: Limited WebRTC support

## 🚀 Key Innovations

### Dynamic Presenter System
Unlike traditional static configurations, this demo features:
- **Real-time API Integration**: Fetches presenters directly from D-ID's live API
- **Interactive Selection**: Visual grid with hover previews and smooth transitions
- **Context Management**: Global state ensures consistency across components
- **Automatic Switching**: Seamless presenter changes with connection management

### Advanced Error Handling
- **Granular Error Parsing**: Extracts specific error details from D-ID responses
- **User-Friendly Display**: Categorized error messages with actionable information
- **Development Tools**: Comprehensive logging and debugging information
- **Graceful Fallbacks**: Multiple layers of fallback systems

### Performance & UX
- **Smart Caching**: 30-minute API response caching to reduce calls
- **Video Fallbacks**: Automatic switching to local videos when remote fails
- **Optimized Rendering**: Context-based architecture prevents unnecessary re-renders
- **Mobile-Responsive**: Works seamlessly across devices and screen sizes

## License

This project is for demonstration purposes. Please ensure you comply with the terms of service for all third-party APIs used (D-ID, OpenAI, Deepgram, ElevenLabs).
