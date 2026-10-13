FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY certs/     /etc/nginx/certs/

# Use certificates from scripts/gen-certs.sh when present; otherwise create a
# self-signed one so `docker compose up` works on a fresh clone.
RUN if [ ! -f /etc/nginx/certs/cert.pem ]; then \
      apk add --no-cache openssl && \
      openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/certs/key.pem -out /etc/nginx/certs/cert.pem \
        -subj "/C=TH/O=RMUTL/CN=localhost"; \
    fi

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
