FROM nginx:alpine

RUN apk add --no-cache openssl

COPY index.html /usr/share/nginx/html/
COPY nginx-https.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
