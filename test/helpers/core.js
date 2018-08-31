const fromAscii = require('./ascii').fromAscii;
const toAscii = require('./ascii').toAscii;
const getCurrentTime = require('./time').getCurrentTime;
const ipfsHash = require('./ipfsHash');
const keccak256 = require('./hash').keccak256;
const increaseTime = require('./time').increaseTime;
const getEvents = require('./getEvents').getEvents;
const checkpoint = require('./checkpoint');
const ethJs = require('ethereumjs-util');

const ID = '12-34';
const ARTICLE_ID = '43-21';
const BASE_VERSION = 1;
const TIMESTAMP = 1535111500;

const IPFS_HASH = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
const CONTENT_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);
const METADATA_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);
const UPDATED_CONTENT_HASH = ipfsHash.getBytes32FromIpfsHash('QmWPCRv8jBfr9sDjKuB5sxpVzXhMycZzwqxifrZZdQ6K9o');

const SECONDS_IN_WEEK = 604800;
const PUBLICATION_TIMEOUT = 172800; //2 days
const MIN_DEADLINE = 259200; //3 days;
const MAX_DEADLINE = 2592000 //30 days;
const BOUNTY = 10000000;
const SOLUTION_LOCATOR_HASH = web3.sha3('Some awesome article');
const UPDATED_SOLUTION_LOCATOR_HASH = web3.sha3('An even more awesome article');
const MAX_CONTRIBUTIONS = 3;

var KauriCore = artifacts.require('KauriCore.sol');
var Storage = artifacts.require('Storage.sol');
var MockCommunity = artifacts.require('MockCommunity.sol');
var Community = artifacts.require('Community.sol');
var MockFundable = artifacts.require('MockFundable.sol');
var Wallet = artifacts.require('Wallet.sol');
var AdminController = artifacts.require('OnlyOwnerAdminController.sol');

var COMMUNITY_ID = '9876-5432';

async function addRequest(contract, accounts, fromAddress, deadline, bountyAmount, msgValue, id, community) {
  if (!fromAddress) { fromAddress = accounts[1]; }
  if (!deadline) { deadline = calculateDueDate(); }
  if (!bountyAmount) { bountyAmount = BOUNTY; }
  if (typeof msgValue === "undefined") { msgValue = BOUNTY; }
  if (!id) { id = ID; }
  if (typeof community === "undefined") { community = COMMUNITY_ID; }

  return await contract.addRequest(id, CONTENT_HASH, community, deadline, bountyAmount,
    {from: fromAddress, value: msgValue});
};

async function updateRequest(contract, accounts, fromAddress, id, updatedContentHash) {
  if (!fromAddress) { fromAddress = accounts[1]; }
  if (!id) { id = ID; }
  if (typeof updatedContentHash === "undefined") { updatedContentHash = UPDATED_CONTENT_HASH; }
  return await contract.updateRequest(id, updatedContentHash,{from: fromAddress});
};

async function getRequest(contract, accounts) {
  return await contract.getRequest.call(ID);
}

async function startWorkOnRequest(contract, accounts, fromAddress, requestId) {
  if (!fromAddress) { fromAddress = accounts[2]; }
  if (!requestId) { requestId = ID }
  await contract.startWorkOnRequest(requestId, {from: fromAddress});
}

async function cancelWorkOnRequest(contract, accounts, fromAddress, requestId) {
  if (!fromAddress) { fromAddress = accounts[2]; }
  if (!requestId) { requestId = ID }
  await contract.cancelWorkOnRequest(requestId, {from: fromAddress});
}

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

async function addRequestPickupAndFulfil(contract, accounts, pickupAddress, submitterAddress) {
  if (!pickupAddress) {
    pickupAddress = accounts[2];
  }

  if (!submitterAddress) {
    submitterAddress = pickupAddress;
  }

  await addRequest(contract, accounts);
  await contract.startWorkOnRequest(ID, {from: pickupAddress});
  let checkpoint = await checkpointArticles(contract, accounts);

  return await fulfilRequest(contract, accounts, checkpoint, submitterAddress);
};

async function addRequestAndFulfil(contract, accounts, submitterAddress, articleId, creatorAddress, requestId, articleVersion) {
  await addRequest(contract, accounts);
  let checkpoint = await checkpointArticles(contract, accounts, articleId, creatorAddress);
  let tx = await fulfilRequest(contract, accounts, checkpoint, submitterAddress, articleId, creatorAddress, requestId, articleVersion);
  return {tx: tx, checkpoint: checkpoint};
}

async function checkpointArticles(contract, accounts, articleId, creatorAddress, articleVersion) {
  if (!articleId) {articleId = ARTICLE_ID};
  if (!creatorAddress) {creatorAddress = accounts[2]};
  if (!articleVersion) {articleVersion = BASE_VERSION};
  let article = {id: articleId, version: articleVersion, contentHash: SOLUTION_LOCATOR_HASH, creator: creatorAddress, timestamp: TIMESTAMP};
  let anotherArticle = {id: "6666", version: 2, contentHash: SOLUTION_LOCATOR_HASH, creator: accounts[3], timestamp: TIMESTAMP};
  let checkpointTree = checkpoint.createArticleCheckpointTree([article, anotherArticle]);
  let checkpointRoot = checkpointTree.getRootHex();
  let sig = createCheckpointSignature(checkpointRoot, IPFS_HASH, accounts[8]);
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

async function fulfilRequest(contract, accounts, checkpoint, submitterAddress, articleId, creatorAddress, requestId, articleVersion, signature) {
  if (!submitterAddress) { submitterAddress = accounts[2];}
  if (!articleId) { articleId = ARTICLE_ID; }
  if (!creatorAddress) { creatorAddress = submitterAddress };
  if (!requestId) { requestId = ID };
  if (!articleVersion) { articleVersion = BASE_VERSION };
  if (!signature) { signature = createApprovalSignature(articleId, articleVersion, requestId, creatorAddress, accounts[9]) }
  return await contract.fulfilRequest(requestId, articleId, articleVersion, SOLUTION_LOCATOR_HASH, 
    creatorAddress, TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof, signature.v, [signature.r, signature.s], {from: submitterAddress});
}

function createApprovalSignature(articleId, articleVersion, requestId, creatorAddress, signerAccount, community) {
  if (typeof community === "undefined") { community = web3.padRight(fromAscii(COMMUNITY_ID), 66); };
  if (community == "") { community = web3.padRight(fromAscii(community), 66); };
  let hash = keccak256(web3.padRight(fromAscii(articleId), 66),
  articleVersion,
  web3.padRight(fromAscii(requestId), 66),
  SOLUTION_LOCATOR_HASH,
  community,
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

async function updateArticle(contract, accounts, standalone, updaterAddress) {
  if (!updaterAddress) {
    updaterAddress = accounts[2];
  }

  let requestId = getRequestId(standalone);

  return await contract.updateArticle(ARTICLE_ID, requestId, UPDATED_SOLUTION_LOCATOR_HASH, {from: updaterAddress});
}

async function tipArticle(contract, accounts, checkpoint, tipAmount, articleId, creatorAddress, valueToSend, articleVersion) {
  if (typeof tipAmount === "undefined") {tipAmount = 1000000};
  if (typeof valueToSend === "undefined") {valueToSend = tipAmount};
  if (!articleId) {articleId = ARTICLE_ID};
  if (!creatorAddress) {creatorAddress = accounts[2]}
  if (!articleVersion) {articleVersion = BASE_VERSION}

  return await contract.tipArticle(articleId, articleVersion, SOLUTION_LOCATOR_HASH, creatorAddress, TIMESTAMP, tipAmount, checkpoint.tree.getRootHex(), checkpoint.proof, {from: accounts[3], value: valueToSend });
}

async function progressToUpdateRequestVote(contract, accounts) {
  await addRequest(contract, accounts)
  await contract.startWorkOnRequest(ID, {from: accounts[2]});
  await contract.startWorkOnRequest(ID, {from: accounts[3]});
  await contract.startWorkOnRequest(ID, {from: accounts[4]});
  return await contract.updateRequest(ID, UPDATED_CONTENT_HASH, {from: accounts[1]});
};

async function getArticle(contract, accounts, standalone, submitterAddress, articleVersion) {
  let requestId = getRequestId(standalone);
  if (!articleVersion) { articleVersion = BASE_VERSION; }
  if (!submitterAddress) { submitterAddress = accounts[2]; }

  return await contract.getArticle.call(ARTICLE_ID, articleVersion, requestId, submitterAddress);
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

async function createCommunity(contract, accounts) {
  await contract.createCommunity(COMMUNITY_ID, [accounts[9]], 
    [accounts[9]], METADATA_HASH, {from: accounts[9]});

  return COMMUNITY_ID;
}

function redeploy(accounts, testFunction) {
  return doRedeploy(accounts, testFunction, MockCommunity, MockFundable);
}

function redeployNoMocks(accounts, testFunction) {
  return doRedeploy(accounts, testFunction, Community, Wallet);
}

function doRedeploy(accounts, testFunction, communityContract, fundableContract) {
  var wrappedFunction = async () => {
    let community = await communityContract.new({ from: accounts[0] })

    let fundable = await fundableContract.new(accounts[9], { from: accounts[0] })

    let kauriCoreContract = await KauriCore.new(MAX_CONTRIBUTIONS, 
                              PUBLICATION_TIMEOUT,
                              MIN_DEADLINE,
                              MAX_DEADLINE, 
                              { from: accounts[0] });

    let adminController = await AdminController.new({ from: accounts[0] });

    let storageContract = await Storage.new({from: accounts[0]});

    await community.setAdminController(adminController.address);
    await fundable.setAdminController(adminController.address);
    await storageContract.setAdminController(adminController.address);
    await kauriCoreContract.setAdminController(adminController.address);

    await kauriCoreContract.setCommunityContractAddress(community.address, {from: accounts[0]});
    await kauriCoreContract.setFundsContractAddress(fundable.address, {from: accounts[0]});

    await kauriCoreContract.setStorageContractAddress(storageContract.address, {from: accounts[0]});
    await storageContract.addWritePermission(kauriCoreContract.address, {from: accounts[0]});
    await storageContract.addWritePermission(community.address, {from: accounts[0]});

    await kauriCoreContract.addCheckpointerAddress(accounts[8], {from: accounts[0]});
    
    
    if (community.setStorageContractAddress) {
      await community.setStorageContractAddress(storageContract.address, {from: accounts[0]});
    }
    
    await createCommunity(community, accounts);

    await fundable.addWritePermission(kauriCoreContract.address);
    await testFunction(kauriCoreContract, fundable);
  };

  return wrappedFunction;
}

function calculateDueDate() {
  return getCurrentTime() + SECONDS_IN_WEEK;
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
  addRequest,
  updateRequest,
  getRequest,
  startWorkOnRequest,
  cancelWorkOnRequest,
  addToBounty,
  refundRequest,
  progressToRefunded,
  progressToUpdateRequestVote,
  fulfilRequest,
  addRequestAndFulfil,
  addRequestPickupAndFulfil,
  updateArticle,
  tipArticle,
  getArticle,
  checkAvailableFundsIncrease,
  checkAvailableFundsDecrease,
  setAvailableFunds,
  redeploy,
  redeployNoMocks,
  calculateDueDate,
  createApprovalSignature,
  getRequestId,
  increaseTimeToPastPublicationPeriod,
  createCommunity,
  checkpointArticles,
  checkpointAndFulfilRequest,
  ARTICLE_ID,
  BASE_VERSION,
  ID,
  BOUNTY,
  IPFS_HASH,
  CONTENT_HASH,
  UPDATED_CONTENT_HASH,
  SOLUTION_LOCATOR_HASH,
  UPDATED_SOLUTION_LOCATOR_HASH,
  COMMUNITY_ID,
  SECONDS_IN_WEEK,
  MIN_DEADLINE,
  MAX_DEADLINE,
  PUBLICATION_TIMEOUT
});