# FoxBot — ghcr.io/jokod/foxbot
# docker build -f .docker/Dockerfile -t foxbot:local .

# Native Node for npm (avoids QEMU SIGILL on arm64 cross-builds)
FROM --platform=$BUILDPLATFORM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
	APP_ENV=prod \
	NPM_CONFIG_UPDATE_NOTIFIER=false

# UID/GID 10001 — match compose.yaml tmpfs
RUN apk add --no-cache tzdata \
	&& addgroup -S -g 10001 foxbot \
	&& adduser -S -u 10001 -G foxbot foxbot \
	&& mkdir -p /app/var/logs \
	&& chown -R foxbot:foxbot /app

COPY --from=deps --chown=foxbot:foxbot /app/node_modules ./node_modules
COPY --chown=foxbot:foxbot . .

USER foxbot

CMD ["node", "bot.js"]
