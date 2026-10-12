import type { NextConfig } from "next";

// Where the Node.js API runs. Locally that's port 4000; on Vercel it's the Render URL.
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // The browser calls /api/... on this same site, and Next.js forwards it to the API.
  // Same site = the login cookie works in every browser (including Safari).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;