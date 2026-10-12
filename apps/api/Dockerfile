# Build from the repo root:  docker build -f apps/api/Dockerfile -t flowforge-api .

# ---- Stage 1: install everything and compile TypeScript ----
FROM node:22-slim AS build
RUN npm install -g pnpm@10.34.5
WORKDIR /app

# Copy only the files needed to install packages first, so Docker can cache this layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @flowforge/api

COPY apps/api apps/api
RUN pnpm --filter @flowforge/api build

# ---- Stage 2: small image with only production packages and the compiled code ----
FROM node:22-slim AS runtime
RUN npm install -g pnpm@10.34.5
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter @flowforge/api

COPY --from=build /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api
# Don't run as root inside the container
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]