#!/usr/bin/env bash

echo "Starting kauri contracts abi server"

echo "Running express (host: $API_HOST, port: $API_PORT)"
cd /scripts
npm install
node ./api.js
