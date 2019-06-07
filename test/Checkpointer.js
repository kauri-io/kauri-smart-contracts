const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const checkpointerTasks = require('./helpers/checkpointerTasks');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;
const checkpoint = require('./helpers/checkpoint');

const Checkpointer = artifacts.require('Checkpointer.sol');
contract('Checkpointer', function(accounts) {

  const DEPLOYER_ACCOUNT = accounts[0];
  const CHECKPOINTER_ACCOUNT = accounts[8];
  let checkpointer;

  before(async () => {
    checkpointer = await Checkpointer.deployed(); 

    await checkpointer.addCheckpointerAddress(CHECKPOINTER_ACCOUNT, {from: DEPLOYER_ACCOUNT});
  });

  it('should allow anyone to add a checkpoint if sig signed by checkpoint account', async () => {
    await checkpointerTasks.checkpointArticles(checkpointer, accounts);
  });
 
  it('should fire an ArticlesCheckpointed event when a checkpoint is added', async () => {
    let checkpoint = await checkpointerTasks.checkpointArticles(checkpointer, accounts);
    let checkpointed = checkpointer.ArticlesCheckpointed({fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(checkpointed);
    assert.equal(logs[0].args.checkpointRoot, checkpoint.tree.getRootHex(), 'Checkpoint root incorrect');
    assert.equal(logs[0].args.checkpointDocumentLocator, checkpointerTasks.IPFS_HASH, 'Checkpoint document locator incorrect');
    assert.equal(logs[0].args.instigator, accounts[0], 'Checkpoint instigator incorrect');
  });

  it('should not allow a checkpoint to be added if sig doesnt match checkpoint account', async () => {
    let article = {id: checkpointerTasks.ARTICLE_ID, version: 1, contentHash: checkpointerTasks.IPFS_HASH, creator: accounts[2], timestamp: checkpointerTasks.TIMESTAMP};
    let anotherArticle = {id: "6666", version: 2, contentHash: checkpointerTasks.ANOTHER_IPFS_HASH, creator: accounts[3], timestamp: checkpointerTasks.TIMESTAMP};
    let checkpointTree = checkpoint.createArticleCheckpointTree([article, anotherArticle]);
    let checkpointRoot = checkpointTree.getRootHex();

    let sig = checkpointerTasks.createCheckpointSignature(checkpointRoot, checkpointerTasks.IPFS_HASH, accounts[0])
    await assertRevert(checkpointerTasks.checkpointArticles(checkpointer, accounts, undefined, undefined, undefined, sig),
        'Checkpoint was added with incorrect signature');
  });

  it('should validate true for a valid, checkpointed article', async () => {
    doValidateArticleProof(true, checkpointerTasks.ARTICLE_ID, 1, checkpointerTasks.IPFS_HASH, accounts[2], checkpointerTasks.TIMESTAMP);
  });

  it('should validate false if checkpoint hash is invalid', async () => {
    doValidateArticleProof(false, checkpointerTasks.ARTICLE_ID, 1, checkpointerTasks.IPFS_HASH, accounts[2], checkpointerTasks.TIMESTAMP, web3.sha3('invalid'));
  });

  it('should validate false if article id is incorrect', async () => {
    doValidateArticleProof(false, checkpointerTasks.ARTICLE_ID + 1, 1, checkpointerTasks.IPFS_HASH, accounts[2], checkpointerTasks.TIMESTAMP);
  });

  it('should validate false if article version is incorrect', async () => {
    doValidateArticleProof(false, checkpointerTasks.ARTICLE_ID, 2, checkpointerTasks.IPFS_HASH, accounts[2], checkpointerTasks.TIMESTAMP);
  });

  it('should validate false if article content hash is incorrect', async () => {
    doValidateArticleProof(false, checkpointerTasks.ARTICLE_ID, 1, checkpointerTasks.IPFS_HASH + 1, accounts[2], checkpointerTasks.TIMESTAMP);
  });

  it('should validate false if article creator is incorrect', async () => {
    doValidateArticleProof(false, checkpointerTasks.ARTICLE_ID, 1, checkpointerTasks.IPFS_HASH, accounts[0], checkpointerTasks.TIMESTAMP);
  });

  it('should validate false if article timestamp is incorrect', async () => {
    doValidateArticleProof(false, checkpointerTasks.ARTICLE_ID, 1, checkpointerTasks.IPFS_HASH, accounts[2], checkpointerTasks.TIMESTAMP + 1);
  });

  it('should validate false if article proof is incorrect', async () => {
    let checkpoint = await checkpointerTasks.checkpointArticles(checkpointer, accounts);
    let proof = checkpoint.proof;
    proof[0] = proof[0] + 1;

    let isValid = await checkpointer.validateArticleProof(
      checkpointerTasks.ARTICLE_ID, 1, checkpointerTasks.IPFS_HASH, accounts[2], checkpointerTasks.TIMESTAMP + 1, checkpoint.tree.getRootHex(), proof);
  });

  async function doValidateArticleProof(expectation, articleId, articleVersion, contentHash, creator, timestamp, rootHash, proof) {
    let checkpoint = await checkpointerTasks.checkpointArticles(checkpointer, accounts);
  
    if (!rootHash) {rootHash = checkpoint.tree.getRootHex()}
    if (!proof) {proof = checkpoint.proof}

    let isValid = await checkpointer.validateArticleProof(
      articleId, articleVersion, contentHash, creator, timestamp, rootHash, proof);
    
    assert.equal(isValid, expectation);
  }

});