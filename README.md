# H5P LTI Provider

## Running from Docker {#docker}

- Create .env and provider/.env files from their .example
  - Adjust .env variables to match your environment.
  - Ajust these variables in provider/.env file according your environment:
    - SERVER_NAME: Our LTI tool domain (ex.: https://h5plti.mydomain.com).
    - ACCEPTED_LTI_CONSUMERS: Which LMS' URLs will be allowed to access our tool (multiple comma separated values are accepted) (ex.: https://trunk-maria.nightly.sakaiproject.org).
    - OAUTH_CONSUMER_KEY and OAUTH_SECRET: LTI related.
    - SESSION_SECRET: Used to secure sessions.
  - Other variables can be left with their default value. Remember to read carefully provider/.env file for advanced configuration.
- Run these commands:
    ```
    docker compose build
    docker compose up

    or

    # FULL (all in one command, clean enviroment)
    docker compose down && docker compose rm -f && docker image prune -f && docker volume prune -f && docker compose build --no-cache && docker compose up -d
    
    # FULL+ (also removes volumes)
    docker compose down -v && docker compose rm -f && docker image prune -f && docker volume prune -f && docker compose build --no-cache && docker compose up -d
    ```

## Running from bash

- Create provider/.env file from provider/.env.example
  - These variables must be changed (this .env file is prepared to run via docker):
    - PORT: Specifies on which port the Node applicacion runs.
    - REDIS_HOST and MONGODB_HOST: It must point to where DBs are running (for example, localhost). Do not use docker service name.
    - REDIS_PORT, REDIS_AUTH_PASS, MONGODB_PORT, MONGODB_USER, MONGODB_PASSWORD, MONGODB_DB
  - Follow same rules as [docker](#docker)
- Run these commands:
    ```
    cd provider
    npm  install  -D  typescript
    npm  install
    npm  run  download
    npm  run  build
    npm run start
    ```

## Configure proxy

This LTI tool is meant to run after a proxy. We delegate SSL management in the proxy and assume some headers will be present in the requests.

![Proxy](docs/proxy.png "Proxy")

Here is an Apache proxy configuration example assuming our LTI tool is running on port 9090:
```
<VirtualHost *:443>
    ServerName MY-DOMAIN
    
    RequestHeader set "X-Forwarded-Proto" expr=%{REQUEST_SCHEME}
    RequestHeader set "X-Forwarded-SSL" expr=%{HTTPS}
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:9090/
    ProxyPassReverse / http://localhost:9090/
    
    ...
    
</VirtualHost>
```

## Additional info (LMS/Sakai related)

This tool is intended to be played both, as a simple LTI launch (a external tool added to a Site), and as a LTI Content Item Selector launch (a learning App added to Lessons or CKEditor). We recommend to create/configure two different external tools in Sakai to avoid mixing configurations related to each kind. In both cases, lauch URL will be the same: **LTI_DOMAIN/launch_lti**
- Site LTI Tool:
    ![Site LTI](docs/site-lti.png "Site LTI")
- Lessons LTI Tool:
    ![Lessons LTI](docs/lessons-lti.png "Lessons LTI")


## LTI requests

![LTI Requests](docs/requests.png "LTI Requests")