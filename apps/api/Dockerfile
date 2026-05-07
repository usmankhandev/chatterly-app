# Stage - 1: Dependency Istaller:
  
  FROM node:20-alpine AS deps
  WORKDIR /app

  COPY nx.json tsconfig.base.json ./

  COPY package*.json nx.json project.json  ./

  RUN npm ci

  COPY /apps/api/prisma /app/apps/api/prisma

  RUN npx prisma generate --schema=/app/apps/api/prisma/schema.prisma


  # Stage - 2: Builder

  FROM node:20-alpine AS builder

  # This created a fresh filesystem again with only node:20-alpine base.
  # So far, node_modules from stage 1 does not exist here yet.

  WORKDIR /app 

  COPY --from=deps /app/node_modules /app/node_modules
  
  COPY package.json package-lock.json nx.json tsconfig.base.json /app/

  COPY apps/api /app/apps/api

  COPY libs /app/libs

  RUN npx nx build api --configuration=production

  # Final Contents froom the Build Stage Are: 

  #   /app/ Contents in Container:
  #       node_modules/
  #       apps/api/src/
  #       libs/
  #       dist/apps/api/main.js (Requried file is main.js since this will be the entry point for our runtime stage)


  FROM node:20-alpine AS runtime
  WORKDIR /app
  COPY --from=builder /app/dist/apps/api/main.js /app/main.js

  COPY --from=deps /app/node_modules /app/node_modules

  COPY --from=deps /app/apps/api/prisma /app/prisma

  
  ENV NODE_ENV=production
  ENV PORT=3001

  EXPOSE 3001


  CMD ["sh", "-c", "npx prisma migrate deploy --schema=/app/prisma/schema.prisma && node main.js"]


#   Final /app/ contents (the actual deployed image):                   ║
# ║    main.js              ← compiled Express app  (~100KB)             ║
# ║    node_modules/        ← runtime deps + Prisma client  (~200MB)     ║
# ║    prisma/                                                           ║
# ║      schema.prisma      ← needed by prisma migrate deploy            ║
# ║      migrations/        ← SQL files applied to DB                    ║
# ║                                                                      ║
# ║  NOT present (stripped out):                                         ║
# ║    apps/api/src/        ← TypeScript source (not needed in prod)     ║
# ║    libs/                ← TypeScript source (not needed in prod)     ║
# ║    __mocks__/           ← test mocks (never in prod)                 ║
# ║    prismaTestClient.ts  ← test client (never in prod)  