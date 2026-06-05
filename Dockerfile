FROM node:20-alpine AS builder
WORKDIR /app
COPY api/package*.json ./
RUN npm ci
COPY api/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY api/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main"]
