# AI Speaker

AI Speaker is a React, Express, tRPC, Drizzle, and MySQL application for AI-assisted lecture creation and virtual speaker workflows. The project includes lecture/project management, TTS/STT, avatar video generation, voice cloning workflows, credits, subscriptions, and storage integration.

## Tech Stack

- React 19 + Vite
- Express + tRPC
- Drizzle ORM + MySQL
- Tailwind CSS
- Vitest
- Stripe payments
- Gemini/D-ID/Kling integrations where configured

## Getting Started

1. Install dependencies.

```bash
pnpm install
```

2. Create an environment file.

```bash
cp .env.example .env
```

3. Fill the required values in `.env`.

Required for server startup:

- `DATABASE_URL`
- `JWT_SECRET` with at least 32 characters

4. Run database migrations.

```bash
pnpm db:push
```

5. Start the development server.

```bash
pnpm dev
```

The server defaults to port `3000` and will try the next available port if it is already in use.

## Scripts

```bash
pnpm dev       # Start the development server
pnpm build     # Build client and server bundle
pnpm start     # Start production server from dist
pnpm check     # TypeScript check
pnpm test      # Run Vitest tests
pnpm format    # Format files with Prettier
pnpm db:push   # Generate and run Drizzle migrations
```

## Storage

If `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` are not configured for Forge-compatible storage, the app falls back to local filesystem storage using `LOCAL_STORAGE_DIR`.

## Security Notes

- Use a long random `JWT_SECRET` in every environment.
- Do not expose provider keys in client-side code.
- Configure Stripe webhook signing with `STRIPE_WEBHOOK_SECRET` before enabling payment fulfillment.
- The STT helper rejects localhost and private-network audio URLs before downloading audio.

## Current Status

This repository appears to be a fast-moving prototype. Before production deployment, review auth, payment, file upload, external URL fetching, and provider key handling carefully.
