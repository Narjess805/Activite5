FROM node:20-alpine

WORKDIR /app
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_FETCH_RETRIES=10
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_LOGLEVEL=verbose

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund --verbose

COPY . .

EXPOSE 8002

CMD ["node", "src/index.js"]
