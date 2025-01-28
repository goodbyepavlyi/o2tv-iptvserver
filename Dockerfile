FROM node:22-alpine@sha256:1322b1e3975e50d4841db1f23f536a8e72249e16a89e1dbbf16953afaa816d41

WORKDIR /app
COPY ./package*.json ./
RUN npm ci
COPY ./src ./src

RUN npm run build:css
RUN npm prune --production

RUN chown -R node:node /app && chmod -R 755 /app
USER node

EXPOSE 3000
CMD ["npm", "run", "start"]