# Live Numeric Graph

Anonymous participants submit a numeric value and everyone can see a live histogram with average, median, and total response count.

## What This Includes

- Public submit page at `/submit`
- Public results page at `/results`
- Real-time updates using Server-Sent Events (SSE)
- Temporary in-memory storage designed for event sessions
- Duplicate controls:
  - one submission per browser session
  - short IP cooldown
- Automatic data cleanup after a few hours (TTL)

## Default Session Settings

- Allowed range: `1.0` to `8.0`
- Histogram bucket size: `0.5`
- Data TTL: 3 hours
- IP cooldown: 30 seconds

Server settings live in `server/config.js`.

## Local Development

Install dependencies:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev:all
```

This starts:
- frontend: `http://localhost:5173`
- API server: `http://localhost:3001`

## Useful Scripts

- `npm run dev:client` - start only Vite frontend
- `npm run dev:server` - start only Express API server
- `npm run build` - build frontend production bundle
- `npm run start` - run API server in non-watch mode
- `npm run lint` - lint frontend and backend files

## API Endpoints

- `GET /api/health` - health check
- `GET /api/stats` - current stats + histogram buckets
- `GET /api/stream` - SSE stream for live updates
- `POST /api/submissions` - submit one numeric response
- `POST /api/admin/reset` - reset all event data (admin key required)

Submission body:

```json
{
  "value": 4.7,
  "sessionId": "uuid-from-browser"
}
```

## Frontend API Configuration

Frontend reads `VITE_API_BASE_URL`.

- Default: `http://localhost:3001`
- Optional override via `.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
ADMIN_RESET_KEY=change-me-before-production
```

## Admin Reset (Simple)

Set `ADMIN_RESET_KEY` in your server environment, then call:

PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/api/admin/reset" `
  -Headers @{ "x-admin-key" = "your-secret-key" }
```

curl:

```bash
curl -X POST http://localhost:3001/api/admin/reset \
  -H "x-admin-key: your-secret-key"
```

This clears all submissions, duplicate/session records, and instantly updates all connected result pages.
