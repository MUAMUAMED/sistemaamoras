FROM node:20-alpine AS build

WORKDIR /app

COPY site-comercial/package*.json ./
RUN npm ci

COPY site-comercial/ ./

ARG VITE_API_URL
ARG VITE_UPLOAD_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_UPLOAD_URL=$VITE_UPLOAD_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
