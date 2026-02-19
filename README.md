# D-ID Next.js Live Streaming Application

Real-time AI avatar streaming with conversational AI, voice recognition, and text-to-speech -- built on Next.js 15, TypeScript, and WebRTC.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.3-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Real-time avatar streaming** via D-ID WebRTC with interactive lip-synced avatars
- **Conversational AI** powered by OpenAI GPT-4.1-nano for low-latency chat
- **Voice recognition** using Deepgram Nova-3 speech-to-text (54% WER improvement over Nova-2)
- **Text-to-speech** via ElevenLabs Flash v2.5 (<75ms latency)
- **Dynamic presenter selection** -- choose from D-ID's presenter library or use custom images
- **Dual streaming modes** -- Clips (pre-trained presenters) and Talks (custom images)
- **Server-side API proxying** -- OpenAI and Deepgram keys never exposed to browser
- **Structured logging** -- level-aware, context-tagged, auto-suppressed in production
- **Glass-morphism UI** with responsive design built on Tailwind CSS v4

## Architecture Overview

```
User Input (text/voice)
       │
       ├── Voice ──► Deepgram Nova-3 (/api/transcribe) ──► Transcription
       │                                                        │
       └── Text ────────────────────────────────────────────────┤
                                                                │
                                                                ▼
                                              OpenAI GPT-4.1-nano (/api/chat)
                                                                │
                                                                ▼
                                                     D-ID Streaming API
                                                   (WebSocket + WebRTC)
                                                                │
                                                ┌───────────────┤
                                                ▼               ▼
                                          ElevenLabs       Video Stream
                                          Flash v2.5       (WebRTC)
                                          (TTS via D-ID)       │
                                                               ▼
                                                         User Display
```

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.3 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | v4 | Utility-first styling |
| Zod | 4.x | Runtime schema validation |
| D-ID API | Streaming | Avatar streaming (WebSocket + WebRTC) |
| OpenAI | GPT-4.1-nano | Chat completions |
| Deepgram | Nova-3 | Speech-to-text |
| ElevenLabs | Flash v2.5 | Text-to-speech |

## Quick Start

### Prerequisites

- Node.js 22+ or Bun 1.x
- API keys from:
  - [D-ID](https://studio.d-id.com/account-settings) -- avatar streaming
  - [OpenAI](https://platform.openai.com/api-keys) -- chat completions
  - [Deepgram](https://console.deepgram.com/) -- speech-to-text
  - [ElevenLabs](https://elevenlabs.io/settings/api-keys) -- text-to-speech

### Installation

```bash
# Clone
git clone <repo-url>
cd d-id-nextjs

# Install dependencies
bun install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Idle Videos (optional)

Place idle video files in the `public/` directory for offline avatar display:
- `emma_idle.mp4` -- Talks mode fallback
- `alex_v2_idle.mp4` -- Clips mode fallback

## Project Structure

```
d-id-nextjs/
├── app/
│   ├── api/
│   │   ├── chat/route.ts           # OpenAI proxy (server-side key)
│   │   ├── transcribe/route.ts     # Deepgram proxy (server-side key)
│   │   ├── animations/route.ts     # D-ID animations CRUD
│   │   ├── images/route.ts         # Image upload handler
│   │   └── presenters/route.ts     # D-ID presenters with caching
│   ├── fonts/                      # Local Geist font files
│   ├── globals.css                 # Tailwind v4 configuration
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Entry point with PresenterProvider
├── components/
│   ├── StreamingChat.tsx           # Main orchestrator
│   ├── VideoDisplay.tsx            # WebRTC video with fallback
│   ├── ChatInterface.tsx           # Text chat with history
│   ├── PresenterSelector.tsx       # Presenter selection modal
│   └── ErrorBoundary.tsx           # React error boundary
├── contexts/
│   └── PresenterContext.tsx        # Global presenter state
├── hooks/
│   ├── useConversation.ts          # Chat history + LLM
│   ├── useDidStreaming.ts          # D-ID connection + video
│   ├── useVoiceRecording.ts        # Microphone + transcription
│   └── index.ts                    # Barrel exports
├── lib/
│   ├── errors.ts                   # Custom error classes
│   ├── services/
│   │   ├── didClient.ts            # D-ID WebSocket/WebRTC client
│   │   ├── webrtcManager.ts        # WebRTC peer connection
│   │   ├── openaiClient.ts         # OpenAI via /api/chat proxy
│   │   ├── deepgramClient.ts       # Deepgram via /api/transcribe proxy
│   │   ├── animationService.ts     # D-ID animation management
│   │   └── index.ts                # Barrel exports
│   └── utils/
│       ├── constants.ts            # Config, models, timing, prompts
│       ├── env.ts                  # Environment validation
│       ├── logger.ts               # Structured logger
│       └── index.ts                # Barrel exports
├── types/
│   ├── api.ts                      # Client-side API config
│   ├── conversation.ts             # Chat message types
│   ├── did.ts                      # D-ID, WebRTC, animation types
│   └── index.ts                    # Barrel exports
├── .env.example                    # Environment variable documentation
├── CLAUDE.md                       # AI assistant guidelines
└── next.config.ts                  # Next.js configuration
```

## Configuration

### Environment Variables

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_DID_API_KEY` | Client | Yes | D-ID API key (used for WebSocket auth) |
| `NEXT_PUBLIC_DID_WEBSOCKET_URL` | Client | No | D-ID WebSocket URL (default: `wss://api.d-id.com`) |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | Client | Yes | ElevenLabs key (sent via D-ID `apiKeyExternal`) |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` | Client | No | ElevenLabs voice (default: Rachel) |
| `OPENAI_API_KEY` | Server | Yes | OpenAI key (never sent to browser) |
| `DEEPGRAM_API_KEY` | Server | Yes | Deepgram key (never sent to browser) |

**Why some keys are client-side**: D-ID's WebSocket requires the API key in the URL auth parameter, and ElevenLabs keys must be sent via D-ID's `apiKeyExternal` WebSocket payload for Talks mode TTS.

## API Reference

### `POST /api/chat`
Proxies chat requests to OpenAI.

**Request body:**
```json
{ "messages": [{ "role": "user", "content": "Hello" }] }
```
**Response:** `{ "content": "Hi there!" }`

### `POST /api/transcribe`
Proxies audio transcription to Deepgram.

**Request:** Raw audio body with `Content-Type: audio/wav`
**Response:** Deepgram transcription response

### `GET /api/presenters`
Lists D-ID presenters (30-minute server cache).

**Response:** `{ "presenters": [...] }`

### `POST /api/animations`
Creates a D-ID animation. Request body validated with Zod.

**Request body:**
```json
{ "source_url": "https://example.com/image.jpg", "config": { "stitch": true } }
```

### `GET /api/animations?id=<animation_id>`
Gets animation status by ID.

### `DELETE /api/animations?id=<animation_id>`
Deletes an animation.

### `POST /api/images`
Uploads an image for use with D-ID animations.

## Development Guide

### Commands

```bash
bun dev          # Development server
bun run build    # Production build
bun run lint     # ESLint
bun start        # Start production server
```

### Code Patterns

**Structured Logging** -- All modules use the shared logger:
```typescript
import { createLogger } from '@/lib/utils/logger';
const log = createLogger('ModuleName');
log.info('Connection established', { streamId: 'abc123' });
```

Logs are level-aware: `debug` is suppressed in production builds. Context is always a `Record<string, unknown>`.

**Service Layer** -- External API calls are isolated in `lib/services/`:
```typescript
import { OpenAIClient } from '@/lib/services';
const client = new OpenAIClient();
const response = await client.getChatCompletion(messages);
```

**Custom Errors** -- Use structured error classes from `lib/errors.ts`:
```typescript
import { ApiError, ValidationError } from '@/lib/errors';
throw new ApiError('Rate limit exceeded', 429);
```

**Timing Constants** -- All delays use named constants:
```typescript
import { TIMING } from '@/lib/utils/constants';
setTimeout(callback, TIMING.ELEVENLABS_RESET_MS);
```

### Adding a New API Proxy

1. Create `app/api/<name>/route.ts`
2. Read server-only key from `process.env.KEY_NAME` (no `NEXT_PUBLIC_` prefix)
3. Validate input with Zod
4. Forward request to external API
5. Return structured response

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel dashboard
3. Add environment variables in Vercel project settings
4. Deploy

### Docker

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "start"]
```

### Self-Hosted

```bash
bun install
bun run build
bun start
```

Ensure all environment variables are set. HTTPS is required for WebRTC and `getUserMedia` in production.

## Security

- **Server-side API proxying**: OpenAI and Deepgram API keys are only accessible in server-side API routes (`/api/chat`, `/api/transcribe`). They are never included in client-side bundles.
- **Client-side keys**: D-ID and ElevenLabs keys remain client-side due to architectural constraints of D-ID's WebSocket protocol. These keys should be scoped to minimal permissions.
- **Input validation**: API routes use Zod schemas for request validation.
- **URL encoding**: Animation IDs and pagination tokens are URL-encoded to prevent injection.

## Troubleshooting

### Common Issues

1. **"Internal server error" from D-ID**
   - Check the error display for connection/request IDs
   - Verify D-ID API key permissions and quotas
   - Ensure the selected presenter is valid and streamable

2. **Presenter videos not loading**
   - Videos automatically fall back to local files if remote URLs fail
   - Ensure local idle videos exist in `/public`

3. **WebRTC connection failed**
   - Check firewall and NAT settings
   - Ensure HTTPS in production (required for WebRTC)
   - Verify D-ID API key and permissions

4. **Voice recording not working**
   - Check microphone permissions in browser
   - Ensure HTTPS (required for `getUserMedia`)
   - Verify Deepgram API key is set in server environment

5. **"Missing required environment variables"**
   - Copy `.env.example` to `.env.local`
   - Fill in all required keys
   - Restart the development server after changes

### Browser Compatibility

| Browser | Support |
|---|---|
| Chrome/Chromium | Full |
| Firefox | Full |
| Safari | Requires WebRTC polyfills |
| Mobile Chrome | Limited WebRTC support |

## Contributing

1. Create a feature branch from `main`
2. Make changes with clear, atomic commits
3. Ensure `bun run build` and `bun run lint` pass
4. Open a pull request with a description of changes

## License

MIT
