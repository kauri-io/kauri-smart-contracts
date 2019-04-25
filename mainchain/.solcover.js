module.exports = {
    compileCommand: "cp ../truffle.js ./truffle.js && truffle compile --network coverage",
    testCommand: "cp ../truffle.js ./truffle.js && truffle test --network coverage",
};
