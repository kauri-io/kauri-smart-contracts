function keccak256(...args) {
  args = args.map(arg => {
    if (typeof arg === 'string') {
      if (arg.substring(0, 2) === '0x') {
          return arg.slice(2)
      } else {
          return web3.utils.toHex(arg).slice(2)
      }
    }

    if (typeof arg === 'number') {
      return web3.utils.padLeft((arg).toString(16), 64, 0)
    } else {
      return ''
    }
  })

  args = args.join('')

  return web3.utils.sha3(args, { encoding: 'hex' })
}

var web3Sign = (data,address) => {
  return new Promise(function(resolve) {
    web3.eth.sign(data,address).then(function(sig) {
          resolve(sig)
      });
  })
}

Object.assign(exports, {
  keccak256,
  web3Sign
});
