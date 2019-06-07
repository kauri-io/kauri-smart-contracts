const fromAscii = require('./ascii').fromAscii;
const toAscii = require('./ascii').toAscii;
const getCurrentTime = require('./time').getCurrentTime;
const ipfsHash = require('./ipfsHash');
const keccak256 = require('./hash').keccak256;
const increaseTime = require('./time').increaseTime;
const getEvents = require('./getEvents').getEvents;
const checkpoint = require('./checkpoint');
const ethJs = require('ethereumjs-util');
const checkpointerTasks = require('./checkpointerTasks');

const ID = '12-34';
const ARTICLE_ID = '43-21';
const BASE_VERSION = 1;
const TIMESTAMP = 1535111500;

const IPFS_HASH = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
const ANOTHER_IPFS_HASH = 'QmRZxt2b1FVZPNqd8hsiykDL3TdBDeTSPX9Kv46HmX4Gx8';
const CONTENT_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);
const METADATA_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);
const UPDATED_CONTENT_HASH = ipfsHash.getBytes32FromIpfsHash('QmWPCRv8jBfr9sDjKuB5sxpVzXhMycZzwqxifrZZdQ6K9o');

const SECONDS_IN_WEEK = 604800;
const PUBLICATION_TIMEOUT = 172800; //2 days
const MIN_DEADLINE = 259200; //3 days;
const MAX_DEADLINE = 2592000 //30 days;
const BOUNTY = 10000000;
const MAX_CONTRIBUTIONS = 3;

var KauriCore = artifacts.require('KauriCore.sol');
var Storage = artifacts.require('Storage.sol');
var MockCommunity = artifacts.require('MockCommunity.sol');
var Community = artifacts.require('Community.sol');
var MockFundable = artifacts.require('MockFundable.sol');
var Wallet = artifacts.require('Wallet.sol');
var AdminController = artifacts.require('OnlyOwnerAdminController.sol');

var COMMUNITY_ID = '9876-5432';

async function createBounty(contract, accounts, fromAddress, deadline, bountyAmount, msgValue, approvers) {

  if (!fromAddress) { fromAddress = accounts[1]; }
  if (!deadline) { deadline = calculateDeadline(); }
  if (!bountyAmount) { bountyAmount = BOUNTY; }
  if (typeof msgValue === "undefined") { msgValue = BOUNTY; }
  if (!approvers) { approvers = [accounts[1]] };

  let tx = await contract.createBounty(IPFS_HASH, deadline, approvers,
    {from: fromAddress, value: msgValue});

  let createBounty = contract.BountyCreated({fromBlock: tx.receipt.blockNumber, toBlock: 'latest'});
  let logs = await getEvents(createBounty);

  return logs[0];
};

async function createBountyAndFulfil(kauriBounty, checkpointer, accounts, submitterAddress, articleId, creatorAddress, articleVersion) {
  let bountyEvent = await createBounty(kauriBounty, accounts);
  let checkpoint = await checkpointerTasks.checkpointArticles(checkpointer, accounts, articleId, creatorAddress);
  let tx = await fulfilBounty(kauriBounty, 
    accounts, checkpoint, submitterAddress, articleId, creatorAddress, bountyEvent.args.bountyAddress, articleVersion);
  return {tx: tx, checkpoint: checkpoint};
}

async function fulfilBounty(kauriBounty, accounts, checkpoint, submitterAddress, articleId, creatorAddress, bountyAddress, articleVersion, signature) {
  if (!submitterAddress) { submitterAddress = accounts[2];}
  if (!articleId) { articleId = ARTICLE_ID; }
  if (!creatorAddress) { creatorAddress = submitterAddress };
  if (!articleVersion) { articleVersion = BASE_VERSION };
  if (!signature) { signature = createApprovalSignature(articleId, articleVersion, bountyAddress, creatorAddress, accounts[1]) }
  
  return await kauriBounty.fulfilBounty(bountyAddress, articleId, articleVersion, IPFS_HASH,
    creatorAddress, TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof, signature.v, [signature.r, signature.s], {from: submitterAddress});
}

async function updateRequest(contract, accounts, fromAddress, id, updatedContentHash) {
  if (!fromAddress) { fromAddress = accounts[1]; }
  if (!id) { id = ID; }
  if (typeof updatedContentHash === "undefined") { updatedContentHash = UPDATED_CONTENT_HASH; }
  return await contract.updateRequest(id, updatedContentHash,{from: fromAddress});
};

async function addToBounty(contract, accounts, fromAddress, requestId, bountyAmount, msgValue) {
  if (!fromAddress) { fromAddress = accounts[3]; }
  if (!requestId) { requestId = ID }
  if (!bountyAmount) { bountyAmount = BOUNTY; }
  if (typeof msgValue === "undefined") { msgValue = BOUNTY; };

  await contract.addToBounty(requestId, bountyAmount, {from: fromAddress, value: msgValue});
}

async function refundRequest(contract, accounts, fromAddress, id) {
  if (!fromAddress) { fromAddress = accounts[1]; }
  if (!id) { id = ID; }

  return await contract.refundRequest(id, {from: fromAddress});
};

async function progressToRefunded(contract, accounts) {
  await addRequest(contract, accounts);
  increaseTimeToPastPublicationPeriod();
  await refundRequest(contract, accounts);
}

async function addRequestAndFulfil(contract, accounts, submitterAddress, articleId, creatorAddress, requestId, articleVersion) {
  await addRequest(contract, accounts);
  let checkpoint = await checkpointArticles(contract, accounts, articleId, creatorAddress);
  let tx = await fulfilRequest(contract, accounts, checkpoint, submitterAddress, articleId, creatorAddress, requestId, articleVersion);
  return {tx: tx, checkpoint: checkpoint};
}

async function checkpointAndFulfilBounty(kauriBounty, checkpointer, accounts, bountyAddress, articleId, creatorAddress, sig, articleVersion) {
  if (!articleId) { articleId = ARTICLE_ID; }
  if (!creatorAddress) { creatorAddress = accounts[2] };
  if (!articleVersion) { articleVersion = BASE_VERSION }
  let checkpoint = await checkpointerTasks.checkpointArticles(checkpointer, accounts, articleId, creatorAddress, articleVersion);
  await fulfilBounty(kauriBounty, accounts, checkpoint, undefined, articleId, creatorAddress, bountyAddress, articleVersion, sig);
  return checkpoint;
}

async function fulfilRequest(contract, accounts, checkpoint, submitterAddress, articleId, creatorAddress, requestId, articleVersion, signature) {
  if (!submitterAddress) { submitterAddress = accounts[2];}
  if (!articleId) { articleId = ARTICLE_ID; }
  if (!creatorAddress) { creatorAddress = submitterAddress };
  if (!requestId) { requestId = ID };
  if (!articleVersion) { articleVersion = BASE_VERSION };
  if (!signature) { signature = createApprovalSignature(articleId, articleVersion, requestId, creatorAddress, accounts[9]) }
  return await contract.fulfilRequest(requestId, articleId, articleVersion, IPFS_HASH,
    creatorAddress, TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof, signature.v, [signature.r, signature.s], {from: submitterAddress});
}

function createApprovalSignature(articleId, articleVersion, bountyAddress, creatorAddress, signerAccount) {
  if (typeof community === "undefined") { community = web3.padRight(fromAscii(COMMUNITY_ID), 66); };
  if (community == "") { community = web3.padRight(fromAscii(community), 66); };
  let hash = keccak256(web3.padRight(fromAscii(articleId), 66),
  articleVersion,
  bountyAddress,
  IPFS_HASH,
  creatorAddress);

  let sig = web3.eth.sign(signerAccount, hash);
  sig = sig.substr(2, sig.length);
  let r = '0x' + sig.substr(0, 64);
  let s = '0x' + sig.substr(64, 64);
  let v = web3.toDecimal(sig.substr(128, 2)) + 27;

  return {"r": r, "s": s, "v": v};
}

function createCheckpointSignature(checkpointRoot, checkpointDocumentHash, signerAccount) {

  let hash = keccak256(checkpointRoot, checkpointDocumentHash);

  let sig = web3.eth.sign(signerAccount, hash);
  sig = sig.substr(2, sig.length);
  let r = '0x' + sig.substr(0, 64);
  let s = '0x' + sig.substr(64, 64);
  let v = web3.toDecimal(sig.substr(128, 2)) + 27;

  return {"r": r, "s": s, "v": v};
}

async function checkAvailableFundsIncrease(address, amount, mockFundable, expectedInvocationCount, index) {
  if (!expectedInvocationCount) {
    expectedInvocationCount = 1;
  }
  if (!index) {
    index = 0;
  }
  let callCount = await mockFundable.addAvailableFundsCount.call()

  assert.equal(callCount, expectedInvocationCount, 'addAvailableFunds invocation count incorrect');

  let toAddressArg = await mockFundable.addAvailableFundsToAddressArg.call(index);
  assert.equal(toAddressArg, address, 'Funds available updated for wrong address');

  let amountArg = await mockFundable.addAvailableFundsAmountArg.call(index);
  assert.equal(amountArg, amount, 'Funds available updated with wrong amount');
};

async function checkAvailableFundsDecrease(address, amount, mockFundable, expectedInvocationCount, index) {
  if (!expectedInvocationCount) {
    expectedInvocationCount = 1;
  }
  if (!index) {
    index = 0;
  }

  let callCount = await mockFundable.deductAvailableFundsCount.call()
  assert.equal(callCount, expectedInvocationCount, 'deductAvailableFunds invocation count incorrect');

  let toAddressArg = await mockFundable.deductAvailableFundsToAddressArg.call(index);
  assert.equal(toAddressArg, address, 'Funds available updated for wrong address');

  let amountArg = await mockFundable.deductAvailableFundsAmountArg.call(index);
  assert.equal(amountArg, amount, 'Funds available updated with wrong amount');
};

async function setAvailableFunds(mockFundable, account, value) {
  await mockFundable.setAvailableFunds(account, value);
}

function calculateDeadline() {
  return getCurrentTime() + SECONDS_IN_WEEK;
}

async function increaseTimeToPastPublicationPeriod() {
  await increaseTime(SECONDS_IN_WEEK + PUBLICATION_TIMEOUT + 1);
}

Object.assign(exports, {
  createBounty,
  createBountyAndFulfil,
  checkpointAndFulfilBounty,
  calculateDeadline,
  ARTICLE_ID,
  BASE_VERSION,
  ID,
  BOUNTY,
  IPFS_HASH,
  ANOTHER_IPFS_HASH,
  CONTENT_HASH,
  UPDATED_CONTENT_HASH,
  COMMUNITY_ID,
  SECONDS_IN_WEEK,
  MIN_DEADLINE,
  MAX_DEADLINE,
  PUBLICATION_TIMEOUT,
  TIMESTAMP,
});