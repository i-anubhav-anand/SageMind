FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the application code (node_modules excluded by .dockerignore)
COPY . .

# Build the application
RUN pnpm build

# Expose port 3000
EXPOSE 3000

# Run the application
CMD ["pnpm", "start"] 