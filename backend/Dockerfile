# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install pnpm
npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install app dependencies
RUN pnpm install --frozen-lockfile

# Copy everything else
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the app
RUN pnpm build

# Expose the listening port
EXPOSE 3001

# Start the server using the production build
CMD ["pnpm", "start:prod"]
