const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;
const checkpoint = require('./helpers/checkpoint');

contract('Checkpoint', function(accounts) {
  it('should allow anyone to add a checkpoint if sig signed by checkpoint account', core.redeploy(accounts, async (underTest) => {
    await core.checkpointArticles(underTest, accounts);
  }));
 
  it('should fire an ArticlesCheckpointed event when a checkpoint is added', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    let checkpointed = underTest.ArticlesCheckpointed({fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(checkpointed);
    assert.equal(logs[0].args.checkpointRoot, checkpoint.tree.getRootHex(), 'Checkpoint root incorrect');
    assert.equal(logs[0].args.checkpointDocumentLocator, core.IPFS_HASH, 'Checkpoint document locator incorrect');
    assert.equal(logs[0].args.instigator, accounts[0], 'Checkpoint instigator incorrect');
  }));

  it('should not allow a checkpoint to be added if sig doesnt match checkpoint account', core.redeploy(accounts, async (underTest) => {
    let article = {id: core.ARTICLE_ID, version: 1, contentHash: core.SOLUTION_LOCATOR_HASH, creator: accounts[2], timestamp: core.TIMESTAMP};
    let anotherArticle = {id: "6666", version: 2, contentHash: core.SOLUTION_LOCATOR_HASH, creator: accounts[3], timestamp: core.TIMESTAMP};
    let checkpointTree = checkpoint.createArticleCheckpointTree([article, anotherArticle]);
    let checkpointRoot = checkpointTree.getRootHex();

    let sig = core.createCheckpointSignature(checkpointRoot, core.IPFS_HASH, accounts[0])
    await assertRevert(core.checkpointArticles(underTest, accounts, undefined, undefined, undefined, sig),
        'Checkpoint was added with incorrect signature');
  }));

  it('should not revert a valid, checkpointed article', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    await underTest.validateArticleProof(core.ARTICLE_ID, 1, core.SOLUTION_LOCATOR_HASH, accounts[2], core.TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof);
  }));

  it('should revert if checkpoint hash is invalid', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    await assertRevert(underTest.validateArticleProof(core.ARTICLE_ID, 1, core.SOLUTION_LOCATOR_HASH, accounts[2], core.TIMESTAMP, web3.sha3('invalid'), checkpoint.proof),
        'validateArticleProof did not revert with incorrect checkpoint');
  }));

  it('should revert if article id is incorrect', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    await assertRevert(underTest.validateArticleProof(core.ARTICLE_ID + 1, 1, core.SOLUTION_LOCATOR_HASH, accounts[2], core.TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof),
        'validateArticleProof did not revert with incorrect article id');
  }));

  it('should revert if article version is incorrect', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    await assertRevert(underTest.validateArticleProof(core.ARTICLE_ID, 2, core.SOLUTION_LOCATOR_HASH, accounts[2], core.TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof),
        'validateArticleProof did not revert with incorrect article version');
  }));

  it('should revert if article content hash is incorrect', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    await assertRevert(underTest.validateArticleProof(core.ARTICLE_ID, 1, core.SOLUTION_LOCATOR_HASH + 1, accounts[2], core.TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof),
        'validateArticleProof did not revert with incorrect article content hash');
  }));

  it('should revert if article creator is incorrect', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    await assertRevert(underTest.validateArticleProof(core.ARTICLE_ID, 1, core.SOLUTION_LOCATOR_HASH, accounts[0], core.TIMESTAMP, checkpoint.tree.getRootHex(), checkpoint.proof),
        'validateArticleProof did not revert with incorrect article creator');
  }));

  it('should revert if article timestamp is incorrect', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    await assertRevert(underTest.validateArticleProof(core.ARTICLE_ID, 1, core.SOLUTION_LOCATOR_HASH, accounts[2], core.TIMESTAMP + 1, checkpoint.tree.getRootHex(), checkpoint.proof),
        'validateArticleProof did not revert with incorrect article timestamp');
  }));

  it('should revert if article proof is incorrect', core.redeploy(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    let proof = checkpoint.proof;
    proof[0] = proof[0] + 1;

    await assertRevert(underTest.validateArticleProof(core.ARTICLE_ID, 1, core.SOLUTION_LOCATOR_HASH, accounts[2], core.TIMESTAMP + 1, checkpoint.tree.getRootHex(), proof),
        'validateArticleProof did not revert with incorrect proof');
  }));

});