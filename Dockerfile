FROM node:20-alpine AS builder

WORKDIR /app

COPY smth-shared ./smth-shared
WORKDIR /app/smth-shared
RUN npm ci --ignore-scripts
RUN npm run build

WORKDIR /app
COPY smth-front-admin/package*.json ./smth-front-admin/
WORKDIR /app/smth-front-admin
RUN npm ci
COPY smth-front-admin ./
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/smth-front-admin/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
