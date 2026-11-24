FROM node:22-alpine AS dependencies
WORKDIR /tests
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM zenika/alpine-chrome:with-node
WORKDIR /tests
COPY --from=dependencies /tests/ ./
COPY seats.test.js reporter.js ./
ENV CHROME_BIN=/usr/bin/chromium-browser
ENTRYPOINT []
CMD ["node", "--test", "seats.test.js"]
