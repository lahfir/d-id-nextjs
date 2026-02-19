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
- **Context-Driven State**: Global presenter state managed via `PresenterContext` at `contexts/PresenterContext.tsx`
- **Service Layer**: Isolated service modules in `lib/services/` for external integrations
- **Custom Hooks**: Business logic abstracted into hooks in `hooks/`
- **Server-Side Proxy**: API routes in `app/api/` proxy requests to protect credentials
- **Structured Logging**: All modules use `createLogger('ModuleName')` from `lib/utils/logger.ts`

### Key Service Integrations
1. **D-ID Streaming**: WebRTC/WebSocket integration for avatar streaming (`lib/services/didClient.ts`)
2. **OpenAI**: GPT-4.1-nano for chat responses, proxied via `/api/chat` (`lib/services/openaiClient.ts`)
3. **Deepgram**: Nova-3 speech-to-text, proxied via `/api/transcribe` (`lib/services/deepgramClient.ts`)
4. **ElevenLabs**: Flash v2.5 text-to-speech for avatar voice (configured in D-ID client)

### API Routes
- `POST /api/chat` -- Proxies OpenAI chat completions (server-side key)
- `POST /api/transcribe` -- Proxies Deepgram transcription (server-side key)
- `GET /api/presenters` -- Lists D-ID presenters (30-min server cache)
- `POST|GET|DELETE /api/animations` -- D-ID animation management (Zod-validated)
- `POST /api/images` -- Image upload for animations

### State Flow
1. User selects presenter -> Updates global context
2. Connect button -> Initiates WebRTC connection via `useDidStreaming` hook
3. Chat/Voice input -> Processed by `useConversation` hook -> `/api/chat` -> D-ID streaming
4. WebRTC events -> Managed by `webrtcManager` service

### Error Handling Pattern
- Custom error classes in `lib/errors.ts` (AppError, ApiError, ConnectionError, etc.)
- All services use try-catch with structured logger
- Errors propagate to UI components for user-friendly display
- Video display has built-in fallback mechanisms

## Important Development Notes

- **TypeScript Strict Mode**: Enabled -- ensure all types are properly defined
- **Path Aliases**: Use `@/` for imports from project root
- **Barrel Exports**: Available at `lib/services/index.ts`, `lib/utils/index.ts`, `types/index.ts`, `hooks/index.ts`
- **Environment Variables** (see `.env.example`):
  - Server-only: `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`
  - Client-side: `NEXT_PUBLIC_DID_API_KEY`, `NEXT_PUBLIC_ELEVENLABS_API_KEY`
- **Zod Validation**: API routes validate inputs with Zod v4 schemas (note: `z.record()` requires key + value types in v4)
- **Timing Constants**: All delays/intervals use named constants from `TIMING` in `lib/utils/constants.ts`
- **Image Optimization**: Remote images from `clips-presenters.d-id.com` are configured in `next.config.ts`
- **Styling**: Uses Tailwind CSS v4 with glass-morphism design patterns
- **Local Fonts**: Geist fonts loaded locally from `app/fonts/` (not Google Fonts)
