FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npx prisma generate --schema=./prisma/schema.prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && npm start"]


#  FROM node:20-alpine

# WORKDIR /app

# # Path changed.
# COPY server/package.json server/package-lock.json* ./
# RUN npm install

# COPY server/prisma ./prisma
# COPY server/tsconfig.json ./
# COPY server/src ./src

# RUN npx prisma generate --schema=./prisma/schema.prisma

# EXPOSE 3001

# CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && npm start"]
