const fromAscii = require('./ascii').fromAscii;
const toAscii = require('./ascii').toAscii;
const getCurrentTime = require('./time').getCurrentTime;
const ipfsHash = require('./ipfsHash');
const keccak256 = require('./hash').keccak256;
const increaseTime = require('./time').increaseTime;
const getEvents = require('./getEvents').getEvents;
const checkpoint = require('./checkpoint');
const ethJs = require('ethereumjs-util');

const ID = ethJs.bufferToHex(new Buffer('0x12-34'));
const ARTICLE_ID = ethJs.bufferToHex(new Buffer('0x43-21'));
const BASE_VERSION = 1;
const TIMESTAMP = 1535111500;

const IPFS_HASH = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
const ANOTHER_IPFS_HASH = 'QmRZxt2b1FVZPNqd8hsiykDL3TdBDeTSPX9Kv46HmX4Gx8';
const CONTENT_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);
const METADATA_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);
const UPDATED_CONTENT_HASH = ipfsHash.getBytes32FromIpfsHash('QmWPCRv8jBfr9sDjKuB5sxpVzXhMycZzwqxifrZZdQ6K9o');

var KauriCheckpoint = artifacts.require('KauriCheckpoint.sol');
var Storage = artifacts.require('Storage.sol');
var AdminController = artifacts.require('OnlyOwnerAdminController.sol');

async function checkpointArticles(contract, accounts, articleId, creatorAddress, articleVersion, sig) {
  if (!articleId) {articleId = ARTICLE_ID};
  if (!creatorAddress) {creatorAddress = accounts[2]};
  if (!articleVersion) {articleVersion = BASE_VERSION};

  let article = {id: articleId, version: articleVersion, contentHash: IPFS_HASH, creator: creatorAddress, timestamp: TIMESTAMP};
  let anotherArticle = {id: "6666", version: 2, contentHash: IPFS_HASH, creator: accounts[3], timestamp: TIMESTAMP};
  let checkpointTree = checkpoint.createArticleCheckpointTree([article, anotherArticle]);
  let checkpointRoot = checkpointTree.getRootHex();
  if (!sig) {sig = await createCheckpointSignature(checkpointRoot, IPFS_HASH, accounts[8])};
  await contract.checkpointArticles(checkpointRoot, IPFS_HASH, sig.v, sig.r, sig.s);

  return {tree: checkpointTree, proof: checkpoint.getProof(checkpointTree, article)};
}

async function checkpointAndFulfilRequest(contract, accounts, articleId, creatorAddress, sig, requestId, articleVersion) {
  if (!articleId) { articleId = ARTICLE_ID; }
  if (!creatorAddress) { creatorAddress = accounts[2] };
  if (!requestId) { requestId = ID }
  if (!articleVersion) { articleVersion = BASE_VERSION }

  let checkpoint = await checkpointArticles(contract, accounts, articleId, creatorAddress, articleVersion);
  await fulfilRequest(contract, accounts, checkpoint, undefined, articleId, creatorAddress, requestId, articleVersion, sig);
  return checkpoint;
}

async function createCheckpointSignature(checkpointRoot, checkpointDocumentHash, signerAccount) {
  let hash = web3.utils.soliditySha3(checkpointRoot,checkpointDocumentHash)
  let sig = await checkpoint.web3Sign(hash,signerAccount);
  sig = sig.substr(2, sig.length);
  let r = '0x' + sig.substr(0, 64);
  let s = '0x' + sig.substr(64, 64);
  let v = web3.utils.toDecimal('0x' + sig.substr(128, 2)) + 27;
  return {"r": r, "s": s, "v": v};
}

function redeploy(accounts, testFunction) {
  return doRedeploy(accounts, testFunction);
}

function redeployNoMocks(accounts, testFunction) {
  return doRedeploy(accounts, testFunction);
}

function doRedeploy(accounts, testFunction) {
  var wrappedFunction = async () => {

    let kauriCheckpointContract = await KauriCheckpoint.new({ from: accounts[0] });

    let adminController = await AdminController.new({ from: accounts[0] });

    let storageContract = await Storage.new({from: accounts[0]});

    await storageContract.setAdminController(adminController.address);
    await kauriCheckpointContract.setAdminController(adminController.address);

    await kauriCheckpointContract.setStorageContractAddress(storageContract.address, {from: accounts[0]});
    await storageContract.addWritePermission(kauriCheckpointContract.address, {from: accounts[0]});

    await kauriCheckpointContract.addCheckpointerAddress(accounts[8], {from: accounts[0]});

    await testFunction(kauriCheckpointContract);
  };

  return wrappedFunction;
}

async function calculateDueDate() {
  let time = await getCurrentTime();
  return time + SECONDS_IN_WEEK;
}

async function increaseTimeToPastPublicationPeriod() {
  await increaseTime(SECONDS_IN_WEEK + PUBLICATION_TIMEOUT + 1);
}

//'Private' helper functions
function getRequestId(standalone) {
  let requestId = ID;
  if (standalone) {
    requestId = "";
  }

  return requestId;
}

Object.assign(exports, {
  redeployNoMocks,
  redeploy,
  createCheckpointSignature,
  checkpointArticles,
  ARTICLE_ID,
  BASE_VERSION,
  ID,
  IPFS_HASH,
  ANOTHER_IPFS_HASH,
  CONTENT_HASH,
  UPDATED_CONTENT_HASH,
  TIMESTAMP,
});
