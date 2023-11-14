# H5P LTI Provider

## Running from bash

- Create provider/.env file
- cd provider
- npm  install  -D  typescript
- npm  install
- npm  run  download
- npm  run  build
- npm run start

## Running from Docker

- Create .env and provider/.env files
- docker compose build
- docker compose up
- FULL: docker compose down && docker compose rm -f && docker image prune -f && docker volume prune -f && docker compose build --no-cache && docker compose up -d