ARG AGENT_TOOLS_IMAGE=ghcr.io/llm-to-apps/agent-tools:sha-d65e104

FROM ${AGENT_TOOLS_IMAGE} AS agent-tools

FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci
RUN npm run prisma:generate

FROM node:22-alpine AS runtime

RUN apk add --no-cache bash ca-certificates git openssh-client patch
COPY --from=agent-tools /usr/local/bin/agent-tools /usr/local/bin/agent-tools

WORKDIR /workspace

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME=0.0.0.0
ENV AGENT_WORKDIR=/workspace
ENV AGENT_TOOLS_PORT=7070
ENV APP_STARTUP_COMMANDS="npm run prisma:generate && npm run db:deploy && npm run db:seed"
ENV APP_COMMAND="npm run dev:docker"

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci
RUN npm run prisma:generate

COPY app ./app
COPY public ./public
COPY src ./src
COPY ui-kit ./ui-kit
COPY next.config.ts ./next.config.ts
COPY next-env.d.ts tsconfig.json ./
COPY AGENT.md README.md .gitignore ./

EXPOSE 80 7070

ENTRYPOINT ["agent-tools"]
