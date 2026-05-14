# Stage - 1: Dependency Istaller:

  FROM node:20-alpine AS deps
  WORKDIR /app

  COPY package.json package-lock.json ./
  COPY nx.json tsconfig.base.json ./
  RUN npm ci --prefer-offline --fetch-timeout=300000

  # Copy entire api app folder — preserving the path
  COPY apps/api ./apps/api
  COPY libs ./libs

  RUN  echo "=== /app/apps/api contents ===" && \
      ls -la /app/apps/api/ && \
      echo "=== tsconfig files ===" && \
      find /app/apps/api -name "tsconfig*" && \
      echo "=== Done ==="
  
  COPY apps/api/prisma ./apps/api/prisma

  RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

  RUN npx nx build api --configuration=production

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
  COPY --from=builder /app/dist/apps/api ./

  COPY --from=deps /app/node_modules /app/node_modules

  COPY --from=deps /app/apps/api/prisma /app/prisma
  
  # COPY .env.development ./
  
  ENV NODE_ENV=production
  ENV PORT=3001

  EXPOSE 3001


  CMD ["sh", "-c", "\
    echo 'Waiting for database...' && \
    until npx prisma migrate deploy --schema=./prisma/schema.prisma; do \
      echo 'Database not ready, retrying in 5 seconds...' && \
      sleep 5; \
    done && \
    echo 'Migrations done, starting server...' && \
    node index.js"]

#   Final /app/ contents (the actual deployed image):                   EE
#    main.js              compiled Express app  (~100KB)             
#    node_modules/        runtime deps + Prisma client  (~200MB)     
#    prisma/                                                           
#      schema.prisma      needed by prisma migrate deploy            
#      migrations/        SQL files applied to DB                    
#                                                                      
#  NOT present (stripped out):                                         
#    apps/api/src/        TypeScript source (not needed in prod)     
#    libs/                TypeScript source (not needed in prod)     
#    __mocks__/           test mocks (never in prod)                 
#     prismaTestClient.ts test client (never in prod)  