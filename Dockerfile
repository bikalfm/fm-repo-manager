# Dev container for running Vite on 0.0.0.0:3013
FROM node:20-alpine
WORKDIR /app

# Install deps first to leverage cache
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Expose Vite dev port
EXPOSE 3013

# Run the Vite dev server binding to all interfaces
CMD ["npm", "run", "dev"]
