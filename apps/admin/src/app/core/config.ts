// Requests go to /api on this same site.
// Locally, proxy.conf.json forwards them to port 4000. On Vercel, vercel.json forwards them to Render.
export const API_URL = '/api';