# Garo2 Frontend

React + Vite frontend for Garo language translation, learning, and admin management.

## Setup

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Start the app with `npm run dev`.

## Default API

Use `http://localhost:8000/api` while developing with the local Express backend.

## Production

Build the frontend with:

```bash
npm run build
```

For separate frontend and backend deployments, create `.env.production` from `.env.production.example` and set:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api
```

Then build with:

```bash
npm run build
```

If you deploy the frontend and backend on the same domain behind a reverse proxy, the app falls back to `/api` when `VITE_API_BASE_URL` is missing. Setting `VITE_API_BASE_URL` explicitly is still the safer production setup.

## Hostinger deployment

1. Set `VITE_API_BASE_URL` to your backend Hostinger URL, for example `https://api.your-domain.com/api`.
2. Run `npm run build`.
3. Upload the generated `dist` contents to your frontend hosting target.
4. Make sure the backend `FRONTEND_ORIGINS` value includes your frontend URL.
