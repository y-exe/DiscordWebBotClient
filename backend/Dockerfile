FROM oven/bun:1.3-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --chown=bun:bun . .
ENV NODE_ENV=production
USER bun
EXPOSE 8000
CMD ["bun", "server.js"]
