# Jarvis AI Assistant

A fully functional AI assistant mobile app named "Jarvis" with an Iron Man HUD interface. Features Polish-language AI voice chat (STT + GPT-4.1 + TTS), weather, world news, sports scores, transport info, maps, and camera access.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/jarvis run dev` — run the Expo app (port 20191)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `OPENAI_API_KEY` — for Jarvis AI features (chat, TTS, STT)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo SDK 54 (expo-router v5, React Native 0.81)
- AI: OpenAI GPT-4.1 (chat), tts-1/onyx (TTS), whisper-1 (STT)

## Where things live

- `artifacts/api-server/src/routes/jarvis.ts` — Jarvis AI backend routes (chat SSE, TTS, STT)
- `artifacts/jarvis/app/(tabs)/index.tsx` — Main HUD screen (the home)
- `artifacts/jarvis/contexts/JarvisContext.tsx` — AI conversation state, SSE streaming
- `artifacts/jarvis/components/HUDRing.tsx` — Animated Iron Man HUD rings (SVG + Animated)
- `artifacts/jarvis/components/NativeMapView.native.tsx` — react-native-maps (native only)
- `artifacts/jarvis/components/NativeMapView.web.tsx` — Web fallback for maps (null)
- `artifacts/jarvis/app/map.web.tsx` — Web-specific map screen (no react-native-maps)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth

## Architecture decisions

- Jarvis AI routes all go through the backend (API key is server-side, not exposed to mobile)
- SSE streaming for chat responses — uses `expo/fetch` on the client for `getReader()` support
- TTS audio returns as base64 JSON (small enough for speech, avoids streaming complexity)
- STT accepts base64-encoded audio from expo-av recording
- `react-native-maps` uses `.native.tsx`/`.web.tsx` platform split to avoid web bundling errors
- Main app uses Stack navigation (no tab bar) — HUD is the root, sub-screens push on top

## Product

- Iron Man HUD-styled mobile interface (dark navy, glowing cyan)
- AI conversation with Polish JARVIS persona (GPT-4.1, voice in/out)
- Weather via Open-Meteo (free, no key required)
- Polish news via TVN24 RSS through rss2json
- Sports scores via ESPN unofficial API (no key required)
- Transport: AI-powered natural language query for Polish transit info
- Interactive map with HUD overlay (native) / coordinates display (web)
- Camera with HUD scanning overlay and photo capture

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `react-native-maps` must be pinned to exactly `1.18.0` (Expo Go compatible); do NOT add to plugins in app.json
- Platform split for map: `NativeMapView.native.tsx` + `NativeMapView.web.tsx` + `app/map.web.tsx`
- `useNativeDriver` must be `Platform.OS !== 'web'` in Animated calls; web doesn't support native driver
- Expo SDK 54 package versions are older than the "expected" versions shown in Metro warnings — app still works
- API base URL in Expo: `https://${process.env.EXPO_PUBLIC_DOMAIN}` (never use localhost directly)
- SSE streaming requires `import { fetch } from 'expo/fetch'` — not the global fetch

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
