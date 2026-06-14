FROM node:24.15.0-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./

RUN noom ci

COPY . .

FROM node:24.15.0-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app .

EXPOSE 10000

USER node

CMD ["npm", "start"]