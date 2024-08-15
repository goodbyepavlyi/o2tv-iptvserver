FROM node:18-alpine AS builder

WORKDIR /app
COPY ./src/package.json /app
COPY ./src/package-lock.json /app
RUN npm ci --omit=dev

FROM node:18-alpine
# Copy build result to a new image (saves a lot of disk space)
COPY --from=builder /app /app
COPY ./src /app

# Move node_modules one directory up, so during development
# we don't have to mount it in a volume.
# This results in much faster reloading!
RUN mv /app/node_modules /node_modules

EXPOSE 3000/tcp

WORKDIR /app
CMD ["node", "app.js"]