FROM node:20-alpine

# Install build deps for native modules (e.g., crypto-js if needed)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose ports (override per service in compose)
EXPOSE 3000 1883