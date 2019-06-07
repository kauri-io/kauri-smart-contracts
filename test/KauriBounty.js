const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const getCurrentTime = require('./helpers/time').getCurrentTime;
const core = require('./helpers/core');
const bountyTasks = require('./helpers/bountyTasks');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;
const ipfsHash = require('./helpers/ipfsHash');

const KauriBounty = artifacts.require('KauriBounty.sol');
const Checkpointer = artifacts.require('Checkpointer.sol');
const StandardBounty = artifacts.require('StandardBounty.sol');
const StandardBountiesFactory = artifacts.require('StandardBountiesFactory.sol');

const EMPTY = '0x0000000000000000000000000000000000000000';

contract('KauriBounty', function(accounts) {

  const DEPLOYER_ACCOUNT = accounts[0];
  const CHECKPOINTER_ACCOUNT = accounts[8];

  let kauriBounty;
  let standardBounty;
  let standardBountyFactory;
  let checkpointer;
  
  before(async () => {
    kauriBounty = await KauriBounty.deployed(); 
    checkpointer = await Checkpointer.deployed();

    await checkpointer.addCheckpointerAddress(CHECKPOINTER_ACCOUNT, {from: DEPLOYER_ACCOUNT});

    standardBounty = await StandardBounty.new({ from: accounts[0] });
    standardBountiesFactory = await StandardBountiesFactory.new(standardBounty.address, { from: accounts[0] });

    kauriBounty.setStandardBountiesFactoryAddress(standardBountiesFactory.address);
  });

  it('should allow a user to create a bounty', async () => {
    await bountyTasks.createBounty(kauriBounty, accounts);
  });

  it('should emit a bountyCreated event with the correct details', async () => {
    let deadline = bountyTasks.calculateDeadline();
    let event = await bountyTasks.createBounty(kauriBounty, accounts, undefined, deadline);

    assert.ok(event.args.bountyAddress);
    assert.equal(event.args.contentHash, bountyTasks.IPFS_HASH);
    assert.equal(event.args.deadline, deadline);
    assert.deepEqual(event.args.approvers, [accounts[1]])
  });

  it('should fund the bounty on creation', async () => {
    let event = await bountyTasks.createBounty(kauriBounty, accounts);
    let bountyBalance = web3.eth.getBalance(event.args.bountyAddress);

    assert.equal(bountyBalance, bountyTasks.BOUNTY);
  });

  it('should set issuer on standard bounty to be KauriBounty contract', async () => {
    let event = await bountyTasks.createBounty(kauriBounty, accounts);
    let bounty = StandardBounty.at(event.args.bountyAddress);
    
    let issuer = await bounty.issuer.call();
    assert.equal(issuer, KauriBounty.address);
  });

  it('should set arbiter on standard bounty to be empty', async () => {
    let event = await bountyTasks.createBounty(kauriBounty, accounts);
    let bounty = StandardBounty.at(event.args.bountyAddress);
    
    let arbiter = await bounty.arbiter.call();
    assert.equal(arbiter, EMPTY);
  });

  it('should set deadline on standard bounty correctly', async () => {
    let deadline = bountyTasks.calculateDeadline();
    let event = await bountyTasks.createBounty(kauriBounty, accounts, undefined, deadline);
    let bounty = StandardBounty.at(event.args.bountyAddress);
    
    let deadlineResult = await bounty.deadline.call();
    assert.equal(deadlineResult,deadline);
  });

  it('should allow any user to fulfil a bounty with valid approval sig', async () => {
    await bountyTasks.createBountyAndFulfil(kauriBounty, checkpointer, accounts);
  });

  it('should allow third party to fulfil a bounty with valid approval sig', async () => {
    await bountyTasks.createBountyAndFulfil(kauriBounty, checkpointer, accounts, accounts[4], undefined, accounts[5]);
  });

  

  // it('should fire a RequestFulfilled event after fulfilment', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);

  //   await core.checkpointAndFulfilRequest(underTest, accounts);
    
  //   await verifyFulfilledEvent(underTest, accounts, core.BASE_VERSION);
  // }));

  it('should not allow an expired bounty to be fulfilled', async () => {
    let event = await bountyTasks.createBounty(kauriBounty, accounts);
    await increaseTime(core.SECONDS_IN_WEEK + 1);
    await assertRevert(bountyTasks.checkpointAndFulfilBounty(kauriBounty, checkpointer, accounts, event.args.bountyAddress),
      'Allowed an expired request to be fulfilled');
  });

  // it('should allow a request to be fulfilled with an article version > 1', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   await core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, undefined, undefined, 2);
  // }));

  // it('should allow multiple fulfilments with the same article id', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequestAndFulfil(underTest, accounts);

  //   await core.addRequest(underTest, accounts, undefined, undefined, undefined, undefined, 'diff-id');
  //   await core.checkpointAndFulfilRequest(underTest, accounts, undefined,  undefined, undefined, 'diff-id');
  // }));

  // it('should not allow a fulfilment for an ACCEPTED request', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   let checkpoint = await core.checkpointAndFulfilRequest(underTest, accounts);
  //   await assertRevert(core.fulfilRequest(underTest, accounts, checkpoint),
  //     'Fulfilment successfully for an accepted request!');
  // }));

  // it('should not allow a fulfilment for a non existing request', core.redeploy(accounts, async (underTest) => {
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts),
  //     'Fulfilment successfully for non existing request!');
  // }));

  // it('should not allow a community request to be fulfilled if sig signed by request creator', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   let sig = core.createApprovalSignature(
  //     core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[2], accounts[1]);
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
  //     'Fulfilled successfully with signature signed by request creator!');
  // }));

  // it('should not allow a non community request to be fulfilled if sig signed by community', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts, undefined, undefined, undefined, undefined, undefined, "");
  //   let sig = core.createApprovalSignature(
  //     core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[2], accounts[9], "");
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
  //     'Fulfilled successfully with signature signed by community!');
  // }));
  
  // it('should not allow a request to be fulfilled if sig article id invalid', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   let sig = core.createApprovalSignature(
  //     "invalid", core.BASE_VERSION, core.ID, accounts[2], accounts[9]);
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
  //     'Fulfilled successfully with invalid signature article id!');
  // }));

  // it('should not allow an article to be fulfilled if sig version invalid', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   let sig = core.createApprovalSignature(
  //     core.ARTICLE_ID, 2, core.ID, accounts[2], accounts[9]);
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
  //     'Fulfilled successfully with invalid signature article version');
  // }));

  // it('should not allow an article to be fulfilled if sig request id invalid', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   let sig = core.createApprovalSignature(
  //     core.ARTICLE_ID, core.BASE_VERSION, "invalid", accounts[2], accounts[9]);
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
  //     'Fulfilled successfully with invalid signature request id');
  // }));

  // it('should not allow an article to be fulfilled if sig creator invalid', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   let sig = core.createApprovalSignature(
  //     core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[3], accounts[9]);
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
  //     'Fulfilled successfully with invalid signature creator address');
  // }));

  // it('should not allow an article to be fulfilled if sig signer invalid', core.redeploy(accounts, async (underTest) => {
  //   await core.addRequest(underTest, accounts);
  //   let sig = core.createApprovalSignature(
  //     core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[2], accounts[8]);
  //   await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
  //     'Fulfilled successfully with invalid signature signer');
  // }));
});