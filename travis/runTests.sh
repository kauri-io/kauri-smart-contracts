#!/bin/bash

set -e

ganache-cli  /dev/null 1> /dev/null &
sleep 5 # to make sure ganache-cli is up and running before compiling
truffle test
kill -9 $(lsof -t -i:8545)
