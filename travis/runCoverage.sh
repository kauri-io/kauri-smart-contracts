output=$(docker exec -it docker_truffle-coverage_1 npm run coverage | tee /dev/tty)
if echo output | grep -q failing; then
    exit 1
else
    exit 0
fi
