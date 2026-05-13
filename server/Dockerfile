FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci --workspace server

COPY server ./server
RUN npm --workspace server run build \
    && npm prune --omit=dev --workspace server

FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/server/dist ./server/dist

RUN mkdir -p /app/data /app/uploads

WORKDIR /app/server
EXPOSE 3001

CMD ["node", "dist/server.js"]
