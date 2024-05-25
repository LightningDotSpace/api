FROM node:18.19.1-alpine3.19

USER node
WORKDIR /home/node

ADD --chown=node:node . /home/node
RUN npm install

CMD [ "npm", "run", "start" ]
