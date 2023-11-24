FROM node:lts

USER node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node . ./
RUN npm install -D typescript
RUN npm install
RUN npm run download
RUN npm run build

# EXPOSE 9090
# ENTRYPOINT ["npm", "run start"]
