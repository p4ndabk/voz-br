FROM node:20-alpine AS base
ENV CI=true
RUN corepack enable
WORKDIR /app/web
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Desenvolvimento: usado pelo docker compose, com hot-reload
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Producao: gera os arquivos estaticos e serve com nginx
FROM base AS build
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS prod
COPY --from=build /app/web/dist /usr/share/nginx/html
# SPA: toda rota desconhecida cai no index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
