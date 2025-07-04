FROM node:20-alpine

WORKDIR /app

# Path changed.
COPY server/package.json server/package-lock.json* ./
RUN npm install

COPY server/prisma ./prisma
COPY server/tsconfig.json ./
COPY server/src ./src

# Copy the production .env file
COPY server/.env.production ./.env.production



RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma && npm start"]
