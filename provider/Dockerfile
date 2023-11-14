FROM node:lts

USER node
RUN mkdir -p /home/node/app/h5p-nodejs-library
WORKDIR /home/node/app/h5p-nodejs-library
COPY --chown=node:node . ./
RUN npm install -D typescript
RUN npm install
RUN npm run download
RUN npm run build

# EXPOSE 9090
# ENTRYPOINT ["npm", "run start"]
