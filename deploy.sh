#!/bin/bash

# Production Deployment Script
git reset --hard
git checkout main
git pull origin main

npm i
npm run build

pm2 start process.config.js --env production

#Development Deployment Script
#  git reset --hard
#  git checkout develop
#  git pull origin develop

# npm i

# pm2 start "npm run start:dev" --name=LuxAuto-dev