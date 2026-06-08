ARG AGENT_TOOLS_IMAGE=ghcr.io/llm-to-apps/agent-tools:sha-5215a04

FROM ${AGENT_TOOLS_IMAGE} AS agent-tools

FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm run prisma:generate

FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

RUN apk add --no-cache bash ca-certificates git openssh-client patch
COPY --from=agent-tools /usr/local/bin/agent-tools /usr/local/bin/agent-tools

WORKDIR /workspace

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV AGENT_WORKDIR=/workspace
ENV AGENT_TOOLS_PORT=7070
ENV APP_COMMAND="npm run start"

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npm run prisma:generate

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3001 7070

ENTRYPOINT ["agent-tools"]
