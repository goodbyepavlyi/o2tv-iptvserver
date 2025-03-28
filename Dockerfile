FROM node:22-alpine@sha256:1322b1e3975e50d4841db1f23f536a8e72249e16a89e1dbbf16953afaa816d41

# Copy and install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy application files
COPY src /app/src
COPY package.json package-lock.json tsconfig.json /app/

# Build the TypeScript project
RUN npm run build

# Copy static files (HTML) after TypeScript compilation
RUN mkdir -p /app/dist/src/Express/Views && cp -r /app/src/Express/Views/*.html /app/dist/src/Express/Views/

# Remove development dependencies
RUN npm prune --omit=dev \
    && rm -rf /app/src \
    && rm -rf /app/tsconfig.json

# Move node_modules for volume mounting optimization
RUN mv /app/node_modules /node_modules \
    && ln -s /node_modules /app/node_modules

RUN chown -R node:node /app && chmod -R 755 /app
USER node

EXPOSE 3000
CMD ["npm", "run", "start"]