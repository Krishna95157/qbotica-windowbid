# WindowBid: static site + plan-reading API in one tiny container (no npm install needed).
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=3000
EXPOSE 3000
# Provide OPENAI_API_KEY at runtime:  docker run -p 3000:3000 -e OPENAI_API_KEY=... windowbid
CMD ["node", "server/server.mjs"]
