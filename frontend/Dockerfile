FROM public.ecr.aws/docker/library/node:20-slim AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# source code will come from the bind mount at runtime.
# vite.config.ts must set server.host to '0.0.0.0' (or run with --host) so the
# dev server is reachable from outside the container — unlike Next, Vite's
# dev server only binds localhost by default.
CMD ["npm", "run", "dev"]

# ---

FROM public.ecr.aws/docker/library/node:20-slim  AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---

FROM public.ecr.aws/docker/library/node:20-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---

FROM public.ecr.aws/docker/library/node:20-slim

WORKDIR /app

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Manual fix of container vulnerabilities
# RUN apt-get --only-upgrade install zlib1g

ENV NODE_ENV=production

# Vite produces a static build — no Node server needed to run the app itself,
# just something to serve the files. `serve` keeps the toolchain Node-only
# instead of introducing nginx for a small POC.
COPY --from=builder /app/dist ./dist
COPY package.json .

EXPOSE 3003

CMD ["npx", "serve", "-s", "dist", "-l", "3003"]
