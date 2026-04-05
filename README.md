# Physician Workspace Web

Web-first physician workspace for case capture, draft review, due queues, and light cohort review.

## Stack

- Next.js 15
- React 19
- MUI 7
- Zustand 5

## Product boundary

- Generic physician case engine on the backend
- Disease-pack aware frontend shell
- Only the `migraine` pack is enabled at launch
- No messenger transport for clinical payload in v1

## Local run

### Demo mode without backend

Create `.env.local` with:

```bash
NEXT_PUBLIC_DEMO_MODE=1
NEXT_PUBLIC_API_BASE_URL=/api
```

For the most reliable local demo run:

```bash
npm install
npm run demo
```

Open `http://localhost:3003/today`.

This mode does not require authentication and does not call the backend. It uses local fixture data stored in `localStorage`.

If you need hot reload while editing, `npm run dev` is also available on the same port.

### Real mode with backend

Create `.env.local` with:

```bash
NEXT_PUBLIC_DEMO_MODE=0
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_URL=http://127.0.0.1:8080
```

Then start the compatible backend separately and run:

```bash
npm install
npm run dev
```

The app serves on `http://localhost:3003`.

In real mode the frontend proxies `/api/*` to `BACKEND_URL`.

## Key routes

- `/login`
- `/today`
- `/capture`
- `/drafts`
- `/cohort`
- `/cases/:id`
