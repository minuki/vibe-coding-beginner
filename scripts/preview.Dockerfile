FROM node:22-alpine
WORKDIR /srv
COPY scripts/dev-server.mjs scripts/live-reload.js ./
USER node
EXPOSE 80
CMD ["node", "dev-server.mjs"]
