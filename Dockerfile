FROM node:19-alpine

# Copy application
COPY src/ /app
WORKDIR /app
RUN npm ci --omit=dev

# Expose ports
EXPOSE 8649

# Set Environment
ENV DEBUG=WebServer,O2TV,Config

# Run Web UI
CMD ["node", "server.js"]