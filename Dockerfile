FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm --prefix client ci && npm --prefix server ci

COPY client ./client
RUN npm --prefix client run build

COPY server ./server
COPY public ./public
COPY package.json ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["npm", "start"]
