# Playwright E2E tests

These tests verify the webapp works end-to-end (UI + Socket.IO backend). Crypto correctness stays in Vitest.

## Prereqs

- Backend running at `http://localhost:3001` (from `Echo-backend`):
  - `cd Echo-backend`
  - `node server.js`
- Install Playwright (one-time):
  - `cd Echo-Chat`
  - `npm i`
  - `npx playwright install`

## Run

- Headless: `cd Echo-Chat; npm run test:e2e`
- UI runner: `cd Echo-Chat; npm run test:e2e:ui`
- Headed: `cd Echo-Chat; npm run test:e2e:headed`
- Continuity suite: `cd Echo-Chat; npm run test:e2e -- chat.continuity.spec.ts`

If your frontend uses a different port, set `ECHO_CHAT_PORT=5173` (or `ECHO_E2E_BASE_URL`).
