FROM node:18-alpine

WORKDIR /app

# Copy the package.json and package-lock.json
COPY src/package*.json ./

# Install npm dependencies
RUN npm ci --omit=dev

# Copy the application
COPY src/ /app

# Expose ports
EXPOSE 3000

# Run application
CMD ["node", "index.js"]