FROM library/node:18-slim
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY *.js ./
ENTRYPOINT ["node", "."]
