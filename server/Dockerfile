FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install wakeonlan and build tools, then install pnpm
RUN apt-get update \
    && apt-get install -y --no-install-recommends iputils-ping \
       python3 \
       build-essential \
       ca-certificates \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install only production dependencies with pnpm
COPY server/package.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install --prod 

# Copy built distribution
COPY server/dist ./dist

# Use non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup -d /usr/src/app -s /sbin/nologin appuser \
    && chown -R appuser:appgroup /usr/src/app
USER appuser

# Environment
ENV PORT=4000 \
    NODE_ENV=production

EXPOSE 4000

# Start the app
CMD ["node", "dist/index.js"]
