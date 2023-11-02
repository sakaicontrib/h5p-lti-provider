# H5P LTI Provider

## Running from bash

- Create .env file
  >PORT=9090
  >DEBUG='h5p-example'
  >CACHE=redis
  >REDIS_HOST=localhost
  >REDIS_PORT=6379
  >REDIS_DB=0
- cd .../h5p-lti-provider/provider
- export $(grep -v '^#' ../.env | xargs -0)  (CARE: only 2 points)
- npm  install  -D  typescript
- npm  install
- npm  run  download
- npm  run  build
- npm run start

## Running from Docker

- Create .env file
  >PORT=9090
  >DEBUG='h5p-example'
  >CACHE=redis
  >REDIS_HOST=redis
  >REDIS_PORT=6379
  >REDIS_DB=0
- cd .../h5p-lti-provider
- docker compose build
- docker compose up