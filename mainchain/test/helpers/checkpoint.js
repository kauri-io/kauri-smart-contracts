const MerkleTree = require('./merkle').MerkleTree;
const keccak256 = require('./hash').keccak256;
const fromAscii = require('./ascii').fromAscii;
const ethJs = require('ethereumjs-util');

var createArticleCheckpointTree = (articles) => {
  var bufferArticles = articles.map((article) => { return hashArticle(article) } );
  var tree = new MerkleTree(bufferArticles, false);
  return tree;
}

var getProof = (tree, article) => {
  let proof = tree.getProof(hashArticle(article), false);

  return proof.map((proofStep) => {return ethJs.bufferToHex(proofStep)});
}

var hashArticle = (article) => {

  let hash = web3.utils.soliditySha3(web3.utils.padRight(article.id,64),
    article.version,
    article.contentHash,
    article.creator,
    article.timestamp);

  let buffer = ethJs.toBuffer(hash);

  return buffer;
}

var web3Sign = (data,address) => {
  return new Promise(function(resolve) {
    web3.eth.sign(data,address).then(function(sig) {
          resolve(sig)
      });
  })
}

Object.assign(exports, {
  createArticleCheckpointTree,
  getProof,
  web3Sign
});
