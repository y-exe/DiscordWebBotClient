FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --omit=optional
COPY --chown=node:node . .
ENV NODE_ENV=production
USER node
EXPOSE 8000
CMD ["node", "server.js"]
