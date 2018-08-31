const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;

contract('RequestFulfilment', function(accounts) {

  it('should allow a contributor flagged as working on a request to fulfil a request', core.redeploy(accounts, async (underTest) => {
    await core.addRequestPickupAndFulfil(underTest, accounts);
  }));

  it('should allow a non-flagged contributor to fulfil a request with valid approval sig', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);
  }));

  it('should allow third party to fulfil a request with valid approval sig', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts, accounts[4], undefined, accounts[5]);
  }));

  it('should allow fulfilment of non-community request with sig from request creator', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts, undefined, undefined, undefined, undefined, undefined, "");
    let sig = core.createApprovalSignature(
      core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[2], accounts[1], "");
    await core.checkpointAndFulfilRequest(underTest, accounts, core.ARTICLE_ID, accounts[2], sig);
  }));

  it('should allow a refunded request to be fulfilled', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await core.refundRequest(underTest, accounts);
    await core.checkpointAndFulfilRequest(underTest, accounts);
  }));

  it('should allow an expired request to be fulfilled', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await increaseTime(core.SECONDS_IN_WEEK + 1);
    await core.checkpointAndFulfilRequest(underTest, accounts);
  }));

  it('should allow a request past the publication period to be fulfilled', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await core.checkpointAndFulfilRequest(underTest, accounts);
  }));

  it('should fire a RequestFulfilled event after fulfilment', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);

    await core.checkpointAndFulfilRequest(underTest, accounts);
    
    await verifyFulfilledEvent(underTest, accounts, core.BASE_VERSION);
  }));

  it('should fire a RequestBountyPaidOut event after fulfilling a request with bounty', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);

    verifyPaidOutEvent(underTest, accounts);
  }));

  it('should fire a RequestBountyPaidOut event after fulfilling a request in publication period', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await increaseTime(core.SECONDS_IN_WEEK + 1);
    await core.checkpointAndFulfilRequest(underTest, accounts);

    verifyPaidOutEvent(underTest, accounts);
  }));

  it('should fire a RequestBountyPaidOut event after fulfilling a request past publication period', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    core.increaseTimeToPastPublicationPeriod();
    await core.checkpointAndFulfilRequest(underTest, accounts);

    verifyPaidOutEvent(underTest, accounts);
  }));

  it('should not fire a RequestBountyPaidOut event after fulfilling a refunded request', core.redeploy(accounts, async (underTest) => {
    await core.progressToRefunded(underTest, accounts);
    await core.checkpointAndFulfilRequest(underTest, accounts);

    let paidOut = underTest.RequestBountyPaidOut({fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(paidOut);

    assert.equal(logs.length, 0, 'Fired RequestBountyPaidOut event for refunded request article');
  }));

  it('should set the request status to ACCEPTED after request fulfilment', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);
    let requestDetails = await underTest.getRequest.call(core.ID);
    assert.equal(requestDetails[1], 2, 'Invalid Status');
  }));

  it('should set the request status to REFUNDED_ACCEPTED after refunded request fulfilment', core.redeploy(accounts, async (underTest) => {
    await core.progressToRefunded(underTest, accounts);
    await core.checkpointAndFulfilRequest(underTest, accounts);
    let requestDetails = await underTest.getRequest.call(core.ID);
    assert.equal(requestDetails[1], 4, 'Invalid Status');
  }));

  it('should update available funds for accepted contributor in funds contract', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.addRequestAndFulfil(underTest, accounts);
    await core.checkAvailableFundsIncrease(accounts[2], core.BOUNTY, mockFundable);
  }));

  it('should update available funds for accepted contributor in funds contract when third party fulfils', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.addRequestAndFulfil(underTest, accounts, accounts[5], undefined, accounts[2]);
    await core.checkAvailableFundsIncrease(accounts[2], core.BOUNTY, mockFundable);
  }));

  it('should update available funds for accepted contributor in funds contract for expired non refunded request', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await core.checkpointAndFulfilRequest(underTest, accounts);
    await core.checkAvailableFundsIncrease(accounts[2], core.BOUNTY, mockFundable);
  }));

  it('should not update available funds for accepted contributor in funds contract for refunded request', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.progressToRefunded(underTest, accounts);
    await core.checkpointAndFulfilRequest(underTest, accounts);
    //Check that the only fund movement is for the refund
    await core.checkAvailableFundsIncrease(accounts[1], core.BOUNTY, mockFundable);
  }));

  it('should allow a request to be fulfilled with an article version > 1', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, undefined, undefined, 2);
  }));

  it('should allow multiple fulfilments with the same article id', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);

    await core.addRequest(underTest, accounts, undefined, undefined, undefined, undefined, 'diff-id');
    await core.checkpointAndFulfilRequest(underTest, accounts, undefined,  undefined, undefined, 'diff-id');
  }));

  it('should not allow a fulfilment for an ACCEPTED request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let checkpoint = await core.checkpointAndFulfilRequest(underTest, accounts);
    await assertRevert(core.fulfilRequest(underTest, accounts, checkpoint),
      'Fulfilment successfully for an accepted request!');
  }));

  it('should not allow a fulfilment for a non existing request', core.redeploy(accounts, async (underTest) => {
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts),
      'Fulfilment successfully for non existing request!');
  }));

  it('should not allow a community request to be fulfilled if sig signed by request creator', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let sig = core.createApprovalSignature(
      core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[2], accounts[1]);
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
      'Fulfilled successfully with signature signed by request creator!');
  }));

  it('should not allow a non community request to be fulfilled if sig signed by community', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts, undefined, undefined, undefined, undefined, undefined, "");
    let sig = core.createApprovalSignature(
      core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[2], accounts[9], "");
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
      'Fulfilled successfully with signature signed by community!');
  }));
  
  it('should not allow a request to be fulfilled if sig article id invalid', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let sig = core.createApprovalSignature(
      "invalid", core.BASE_VERSION, core.ID, accounts[2], accounts[9]);
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
      'Fulfilled successfully with invalid signature article id!');
  }));

  it('should not allow an article to be fulfilled if sig version invalid', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let sig = core.createApprovalSignature(
      core.ARTICLE_ID, 2, core.ID, accounts[2], accounts[9]);
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
      'Fulfilled successfully with invalid signature article version');
  }));

  it('should not allow an article to be fulfilled if sig request id invalid', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let sig = core.createApprovalSignature(
      core.ARTICLE_ID, core.BASE_VERSION, "invalid", accounts[2], accounts[9]);
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
      'Fulfilled successfully with invalid signature request id');
  }));

  it('should not allow an article to be fulfilled if sig creator invalid', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let sig = core.createApprovalSignature(
      core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[3], accounts[9]);
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
      'Fulfilled successfully with invalid signature creator address');
  }));

  it('should not allow an article to be fulfilled if sig signer invalid', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let sig = core.createApprovalSignature(
      core.ARTICLE_ID, core.BASE_VERSION, core.ID, accounts[2], accounts[8]);
    await assertRevert(core.checkpointAndFulfilRequest(underTest, accounts, undefined, undefined, sig),
      'Fulfilled successfully with invalid signature signer');
  }));

});

async function verifyFulfilledEvent(underTest, accounts, expectedVersion) {
  var fulfilled = underTest.RequestFulfilled({fromBlock: 0, toBlock: 'latest'});
  let logs = await getEvents(fulfilled);

  //expect blank request id for standalone
  let expectedRequestId = core.ID;

  assert.equal(toAscii(logs[0].args.requestId), expectedRequestId, 'Request Id incorrect');
  assert.equal(toAscii(logs[0].args.articleId), core.ARTICLE_ID, 'Article Id incorrect');
  assert.equal(logs[0].args.creator, accounts[2]);
  assert.equal(logs[0].args.contentHash, core.SOLUTION_LOCATOR_HASH, 'Content hash incorrect');
  assert.equal(logs[0].args.moderator, accounts[9], 'Moderator incorrect');
  assert.equal(logs[0].args.articleVersion, expectedVersion, 'Version incorrect');
}

async function verifyPaidOutEvent(underTest, accounts) {
  let paidOut = underTest.RequestBountyPaidOut({fromBlock: 0, toBlock: 'latest'});
  let logs = await getEvents(paidOut);

  assert.equal(toAscii(logs[0].args.articleId), core.ARTICLE_ID, 'Article Id incorrect');
  assert.equal(toAscii(logs[0].args.requestId), core.ID, 'Request Id incorrect');
  assert.equal(logs[0].args.acceptedCreator, accounts[2], 'Creator incorrect');
  assert.equal(logs[0].args.bountyTotal, core.BOUNTY, 'Bounty incorrect');
}