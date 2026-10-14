FROM node:20-alpine
WORKDIR /app
COPY server.cjs ./server.cjs
EXPOSE 8080
USER node
CMD ["node", "--max-old-space-size=256", "server.cjs"]
