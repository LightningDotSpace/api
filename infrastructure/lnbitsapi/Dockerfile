# Stage 0
FROM node:18.19.1-alpine3.19 AS builder

USER node
WORKDIR /home/node

ADD --chown=node:node package.json .
ADD --chown=node:node package-lock.json .
RUN npm install

ADD --chown=node:node . .
RUN npm run build

# Stage 1
FROM node:18.19.1-alpine3.19

USER node
WORKDIR /home/node

COPY --from=builder /home/node/package.json /home/node/package-lock.json ./
COPY --from=builder /home/node/dist ./dist

RUN npm install --omit=dev

CMD [ "node", "dist/server.js" ]
