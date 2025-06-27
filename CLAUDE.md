# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development & Build Commands
- **Development**: `bun dev` (Never run dev server directly as requested)
- **Build**: `bun run build` 
- **Start Production**: `bun start`
- **Lint**: `bun run lint`
- **IMPORTANT**: Always test the production build at the end of any changes using `bun run build`

### Node Version
- If npm version errors occur, use: `nvm use 22`

## Architecture Overview

This is a Next.js 15 App Router application that implements a D-ID live streaming demo with AI chat capabilities.

### Core Architecture Pattern
- **Context-Driven State**: Global presenter state managed via `PresenterContext` at `app/providers/PresenterProvider.tsx`
- **Service Layer**: Isolated service modules in `lib/services/` for external integrations
- **Custom Hooks**: Business logic abstracted into hooks in `lib/hooks/`
- **Server-Side Proxy**: API routes in `app/api/` proxy requests to D-ID API to protect credentials

### Key Service Integrations
1. **D-ID Streaming**: WebRTC/WebSocket integration for avatar streaming (`lib/services/didClient.ts`)
2. **OpenAI**: GPT-4 for chat responses (`lib/services/openaiClient.ts`)
3. **Deepgram**: Real-time speech-to-text (`lib/services/deepgramClient.ts`)
4. **ElevenLabs**: Text-to-speech for avatar voice (configured in D-ID client)

### State Flow
1. User selects presenter → Updates global context
2. Connect button → Initiates WebRTC connection via `useDidStreaming` hook
3. Chat/Voice input → Processed by `useConversation` hook → OpenAI → D-ID streaming
4. WebRTC events → Managed by `webrtcManager` service

### Error Handling Pattern
- All services use try-catch with descriptive error messages
- Errors propagate to UI components for user-friendly display
- Video display has built-in fallback mechanisms

## Important Development Notes

- **TypeScript Strict Mode**: Enabled - ensure all types are properly defined
- **Path Aliases**: Use `@/` for imports from project root
- **Environment Variables**: Required keys in `.env.local`:
  - `D_ID_API_KEY`
  - `OPENAI_API_KEY`
  - `DEEPGRAM_API_KEY`
  - `ELEVENLABS_API_KEY`
- **Image Optimization**: Remote images from `clips-presenters.d-id.com` are configured in `next.config.ts`
- **Styling**: Uses Tailwind CSS v4 with glass-morphism design patterns