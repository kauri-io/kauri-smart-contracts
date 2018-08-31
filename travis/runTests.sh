output=$(docker exec -it docker_truffle-test_1 truffle test | tee /dev/tty)
if echo output | grep -q failing; then
    exit 1
else
    exit 0
fi
