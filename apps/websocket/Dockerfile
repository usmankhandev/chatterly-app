# Stage 1: Dependencies

FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json /app/
COPY nx.json tsconfig.base.json /app/
COPY project.json /app/

RUN npm ci

# Stage 2: Builder

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

COPY package.json package-lock.json /app/
COPY nx.json tsconfig.base.json /app/
COPY apps/websocket /app/apps/websocket
COPY libs /app/libs

RUN npx nx build websocket --configuration=production

# Stage 3: Production Runtime

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/dist/apps/websocket/main.js /app/main.js

COPY --from=deps /app/node_modules /app/node_modules

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["node", "main.js"]

