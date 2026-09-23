# syntax=docker/dockerfile:1.7
FROM node:22.13.0-bookworm-slim AS workspace

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# The Corepack bundled with this Node release has stale npm signing keys.
# Install the repository-pinned pnpm version directly for deterministic builds.
RUN npm install --global pnpm@11.17.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile \
    --filter @purposemint/api... \
    --filter @purposemint/dashboard...

COPY . .
RUN pnpm --filter @purposemint/contracts build

FROM workspace AS api-dev
EXPOSE 4000
CMD ["pnpm", "--filter", "@purposemint/api", "dev"]

FROM workspace AS dashboard-dev
EXPOSE 3000
CMD ["pnpm", "--filter", "@purposemint/dashboard", "dev", "--hostname", "0.0.0.0"]
