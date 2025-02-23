FROM node:22

RUN npm install -g pnpm

RUN mkdir /app
WORKDIR /app
ADD ./src /app/src
ADD ./config.yml.template /app/config.yml.template
ADD ./gen-config.mjs /app/gen-config.mjs
ADD ./package.json /app/package.json
ADD ./pnpm-lock.yaml /app/pnpm-lock.yaml
ADD ./tsconfig.json /app/tsconfig.json

VOLUME /data
ENV DATA_DIR=/data

RUN pnpm install
ENTRYPOINT pnpm start