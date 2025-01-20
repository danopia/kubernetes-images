FROM library/node:18-slim
WORKDIR /app
COPY package.json yarn.lock ./
RUN NODE_OPTIONS="--dns-result-order=ipv4first" yarn
COPY *.js ./
ENTRYPOINT ["node", "."]
