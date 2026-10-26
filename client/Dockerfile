# ---- build ----
FROM node:20-bookworm-slim AS build

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=6144"

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Same-origin /api; nginx proxies it to the API container.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---- run ----
FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
