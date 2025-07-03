# Using official Node.js LTS image

FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copying package.json and prisma files from server directory
COPY server/package.json ./package.json
COPY server/prisma ./prisma
RUN npm install

# Copying the rest of the code
COPY server/. .

# Building Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Exposing the port the app runs on
EXPOSE 3001

# Starting the application
CMD ["npm", "run", "dev"]

