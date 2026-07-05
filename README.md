# morg — Mail Organizer

A browser-based PWA for organizing Gmail. Bulk actions, sender filters, and plugin extensions — on PC, tablet, or phone.

## Features

- **Bulk operations** — archive, delete, mark read/unread across multiple threads at once
- **Sender filter** — view all threads from a sender and act on them together
- **Task queue** — background processing with progress banner and retry on failure
- **Plugin system** — extend with custom thread actions (built-in: Webhook, Open in Gmail, Copy Subject)
- **PWA** — installable on iOS, Android, and desktop; works offline after first load
- **i18n** — Japanese and English UI, auto-detected from browser language

## Architecture

```
Browser (Vue 3 SPA / PWA)
  └─ Netlify Functions (serverless)
       └─ Gmail API  ←→  Google OAuth 2.0
```

- **Frontend** (`apps/web`): Vue 3 + Pinia + TanStack Query + Tailwind CSS, built with Vite
- **Backend** (`packages/functions`): Netlify Functions (Node.js) — OAuth token exchange, Gmail API proxy
- **Auth**: Google OAuth 2.0 with server-side token storage in encrypted session cookies (`COOKIE_SECRET`)

## Self-hosting

### Prerequisites

| Item | Notes |
|------|-------|
| [Netlify](https://netlify.com) account | Free tier is sufficient |
| Google Cloud project | [console.cloud.google.com](https://console.cloud.google.com) |
| Gmail API enabled | APIs & Services → Enable APIs → Gmail API |
| OAuth 2.0 client ID | Application type: **Web application** |

### Steps

1. **Fork** this repository on GitHub

2. **Connect to Netlify**
   - New site → Import from Git → select your fork
   - Build command: `bun run build:all`
   - Publish directory: `apps/web/dist`
   - Functions directory: `netlify/functions`

3. **Set environment variables** in Netlify (Site settings → Environment variables):

   | Variable | Description |
   |----------|-------------|
   | `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID |
   | `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
   | `GOOGLE_REDIRECT_URI` | `https://<your-site>.netlify.app/.netlify/functions/auth-callback` |
   | `APP_URL` | `https://<your-site>.netlify.app` |
   | `COOKIE_SECRET` | Random 32+ character string for session encryption |

4. **Add the redirect URI** to your Google OAuth client:
   `https://<your-site>.netlify.app/.netlify/functions/auth-callback`

5. **Deploy** — push to main triggers an automatic Netlify deploy

### Local development

```bash
# Install dependencies
bun install

# Start dev server (Netlify CLI proxies functions)
bun run dev

# Run tests
bun run --cwd apps/web test
bun run --cwd packages/functions test

# Type check
bun run --cwd apps/web typecheck
```

## License

MIT
