# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine
WORKDIR /app

# Copy built assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy package files needed to install 'serve'
COPY package.json package-lock.json* ./

# Install only 'serve' for production
RUN npm install --omit=dev serve

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application using serve
# -s serves the dist folder in SPA mode (redirects all requests to index.html)
# -l listens on port 3001
CMD ["npx", "serve", "-s", "dist", "-l", "3001"]
