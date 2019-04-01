const bs58 = require('bs58');

var getBytes32FromIpfsHash = ipfsHash => {
  const decoded = bs58.decode(ipfsHash);

  return `0x${decoded.slice(2).toString('hex')}`;
};

var getIpfsHashFromBytes32 = bytes32Hex => {
  const hashHex = "1220" + bytes32Hex.slice(2);
  const hashBytes = Buffer.from(hashHex, 'hex');
  const hashStr = bs58.encode(hashBytes);
  return hashStr;
}

Object.assign(exports, {
  getBytes32FromIpfsHash,
  getIpfsHashFromBytes32
});