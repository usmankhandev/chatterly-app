# Stage 1:  Deps

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

COPY apps/gateway /app/apps/gateway

COPY libs /app/libs

# NestJS builds via Nx.

RUN npx nx build gateway --configuration=production

# Stage 3: Production Runtime

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/dist/apps/gateway/main.js /app/main.js
COPY --from=deps /app/node_modules /app/node_modules

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "main.js"]