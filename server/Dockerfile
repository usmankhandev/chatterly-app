# Using official Node.js LTS image

FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Installing dependencies
COPY package*.json ./
RUN npm install

# Copying the rest of the code
COPY . .

# Building Prisma Client
RUN npx prisma generate

# Exposing the port the app runs on
EXPOSE 3001

# Starting the application
CMD ["npm", "run", "dev"]

