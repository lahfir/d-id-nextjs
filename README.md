# D-ID Streaming Assistant

An AI-powered streaming assistant built with Next.js, featuring D-ID avatars, voice recognition with Deepgram, and GPT-4o integration.

## Features

- 🎥 **Real-time Avatar Streaming**: D-ID WebRTC streaming with interactive avatars
- 🎤 **Voice Recognition**: Deepgram Nova-2 speech-to-text transcription
- 🤖 **AI Chat**: GPT-4o integration for intelligent conversations
- 💬 **Text & Voice Input**: Support both text and voice interactions
- 🎨 **Modern UI**: Responsive design with Tailwind CSS
- 🔧 **TypeScript**: Fully typed for better development experience

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
   NEXT_PUBLIC_DID_SERVICE=talks

   # OpenAI API Configuration
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

   # Deepgram API Configuration
   NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_api_key_here

   # ElevenLabs API Configuration
   NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   NEXT_PUBLIC_ELEVENLABS_VOICE_ID=cgSgspJ2msm6clMCkdW9
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

## Usage

1. **Connect**: Click the "Connect" button to establish a connection to D-ID streaming
2. **Chat**: Type messages in the text input or use voice recording
3. **Voice**: Hold the "Hold to Record" button to capture voice input
4. **Watch**: The avatar will respond with synthesized speech and lip-sync

## Architecture

The application is built with a modular, DRY architecture:

### Services
- `deepgramClient.ts` - Speech-to-text transcription
- `openaiClient.ts` - GPT-4o chat completions
- `didClient.ts` - D-ID WebSocket and WebRTC management
- `webrtcManager.ts` - WebRTC peer connection handling

### Hooks
- `useConversation.ts` - Chat history and LLM interactions
- `useVoiceRecording.ts` - Audio capture and transcription
- `useDidStreaming.ts` - D-ID connection and video streaming

### Components
- `StreamingChat.tsx` - Main application component
- `VideoDisplay.tsx` - Avatar video display with fallback
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

## Error Handling

The app includes comprehensive error handling:
- API rate limiting detection
- Connection failure recovery
- User-friendly error messages
- Error boundaries for graceful degradation

## Development

### Project Structure
```
├── app/                 # Next.js App Router
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # API clients and business logic
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and constants
└── public/             # Static assets
```

### Code Style
- Modular, single-responsibility components
- Custom hooks for state management
- TypeScript interfaces for type safety
- Docstrings for all public functions
- Error boundaries and graceful degradation

## Troubleshooting

### Common Issues

1. **WebRTC Connection Failed**
   - Check firewall settings
   - Ensure HTTPS in production
   - Verify D-ID API key

2. **Voice Recording Not Working**
   - Check microphone permissions
   - Ensure HTTPS for getUserMedia
   - Verify Deepgram API key

3. **Rate Limiting**
   - Wait before retrying
   - Check API key quotas
   - Implement exponential backoff

### Browser Compatibility

- Chrome/Chromium: Full support
- Firefox: Full support
- Safari: Requires additional WebRTC polyfills
- Mobile browsers: Limited WebRTC support

## License

This project is for demonstration purposes. Please ensure you comply with the terms of service for all third-party APIs used.
