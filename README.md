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

1. Start the backend in `C:\Projects\atelic\doctor-voicebot`
2. Set `WEB_APP_ORIGIN=http://localhost:3001` in the backend `.env`
3. In this app, keep `NEXT_PUBLIC_API_BASE_URL=/api`
4. Run:

```bash
npm install
npm run dev
```

The app serves on `http://localhost:3001`.

For phone testing, expose only the frontend port. The app proxies `/api/*` to the backend on `127.0.0.1:8000`, so one public origin is enough.

## Key routes

- `/login`
- `/today`
- `/capture`
- `/drafts`
- `/cohort`
- `/cases/:id`
