const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const getCurrentTime = require('./helpers/time').getCurrentTime;
const core = require('./helpers/core');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;
const ipfsHash = require('./helpers/ipfsHash');

contract('RequestBase', function(accounts) {
  it('should allow any user to add a request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts)
  }));

  it('should not allow a request to be added with a deadline below min', core.redeploy(accounts, async (underTest) => {
    await assertRevert(core.addRequest(underTest, accounts, undefined, await getCurrentTime() + core.MIN_DEADLINE - 100),
      'Request deadline below minimum was added successfully!');
  }));

  it('should not allow a request to be added with a deadline above max', core.redeploy(accounts, async (underTest) => {
    await assertRevert(core.addRequest(underTest, accounts, undefined, await getCurrentTime() + core.MAX_DEADLINE + 100),
      'Request deadline above maximum was added successfully!');
  }));

  it('should be able to retrieve correct request details after adding', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    let requestDetails = await core.getRequest(underTest, accounts);

    assert.equal(requestDetails[0], core.BOUNTY, 'Invalid request bounty');
    assert.equal(requestDetails[1], 1, 'Invalid request status');
    assert.equal(requestDetails[2], accounts[1], 'Invalid request creator');
    assert.equal(requestDetails[3], 1, 'Invalid flagged count');
  }));

  it('should fire a RequestCreated event after a request is added', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);

    var created = underTest.getPastEvents('RequestCreated',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(created);

    assert.equal(web3.utils.hexToUtf8(logs[0].args.id), web3.utils.hexToUtf8(core.ID), 'Id not correct on added event');
    assert.equal(logs[0].args.creator, accounts[1], 'Creator not correct on event')
    //TODO check topic...bytes32 seems to be encoded weirdly
  }));

  it('should send bounty to funds contract when adding a request', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.addRequest(underTest, accounts);
    assert.equal(await web3.eth.getBalance(mockFundable.address), core.BOUNTY);
  }));

  it('should deduct from available balance if bounty is more than msg.value', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.setAvailableFunds(mockFundable, accounts[1], core.BOUNTY * 2)
    await core.addRequest(underTest, accounts, undefined, undefined, core.BOUNTY * 2);
    await core.checkAvailableFundsDecrease(accounts[1], core.BOUNTY, mockFundable);
  }));

  it('should deduct from available balance if msg.value is zero', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.setAvailableFunds(mockFundable, accounts[1], core.BOUNTY)
    await core.addRequest(underTest, accounts, undefined, undefined, undefined, 0);
    await core.checkAvailableFundsDecrease(accounts[1], core.BOUNTY, mockFundable);
  }));

  it('should error if value and available funds is less than bounty', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.setAvailableFunds(mockFundable, accounts[1], core.BOUNTY)
    await assertRevert(core.addRequest(underTest, accounts, undefined, undefined, core.BOUNTY * 2 + 1, core.BOUNTY),
        'Didnt error when bounty exceeded funds');
  }));

  it('should error if value is greater than bounty', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.setAvailableFunds(mockFundable, accounts[1], core.BOUNTY);
    await assertRevert(core.addRequest(underTest, accounts, undefined, undefined, core.BOUNTY, core.BOUNTY + 1),
        'Didnt error when value exceeds bounty');
  }));

  it('should allow anyone to start work on a CREATED request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
  }));

  it('should increment the request flagged count after starting work on request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    let requestDetails = await core.getRequest(underTest, accounts);
    assert.equal(requestDetails[3], 1, 'Flagged count not incremented');
  }));

  it('should fire a RequestFlagged event when a user called startWorkOnTicket', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    let flagged = underTest.getPastEvents('RequestFlagged',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(flagged);
    assert.equal(web3.utils.hexToUtf8(logs[0].args.requestId), web3.utils.hexToUtf8(core.ID), 'Id incorrect');
    assert.equal(logs[0].args.contributorAddress, accounts[2], 'Contributor address incorrect');
  }));

  it('should still allow a request to be picked up if someone else is already working on it', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts, accounts[2]);
    await core.startWorkOnRequest(underTest, accounts, accounts[3]);
  }));

  it('should not allow someone to "start work" on a request that hasnt been created', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await assertRevert(core.startWorkOnRequest(underTest, accounts, undefined, core.ID + 1),
        'Request" was picked up when it doesnt exist!');
  }));

  it('should allow a provider to cancel working on a request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    await core.cancelWorkOnRequest(underTest, accounts);
    let requestDetails = await core.getRequest(underTest, accounts);
    assert.equal(requestDetails[3], 0, 'Flagged count status not reset back to 0');
  }));

  it('should fire a RequestUnflagged event when a user cancels working on a request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    await core.cancelWorkOnRequest(underTest, accounts);
    let unflagged = underTest.getPastEvents('RequestUnflagged',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(unflagged);
    assert.equal(web3.utils.hexToUtf8(logs[0].args.requestId), web3.utils.hexToUtf8(core.ID), 'Id incorrect');
    assert.equal(logs[0].args.contributorAddress, accounts[2], 'Contributor address incorrect');
  }));

  it('should fire a RequestReset event if all contributors cancel working on request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts, accounts[3]);
    await core.cancelWorkOnRequest(underTest, accounts);
    await core.cancelWorkOnRequest(underTest, accounts, accounts[3]);
    let reset = underTest.getPastEvents('RequestReset',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(reset);
    assert.equal(web3.utils.hexToUtf8(logs[0].args.requestId), web3.utils.hexToUtf8(core.ID), 'Id incorrect');
  }));

  it('should error if non provider calls cancelWorkOnRequest', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    await assertRevert(core.cancelWorkOnRequest(underTest, accounts, accounts[5]),
        'Did not error when calling cancelWorkOnRequest from non provider account');
  }));

  it('should error if cancelWorkOnRequest is called when not in WORK_IN_PROGRESS state', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await assertRevert(core.cancelWorkOnRequest(underTest, accounts),
        'Did not error when calling cancelWorkOnRequest when not in WORK_IN_PROGRESS state');
  }));

  it('should error if cancelWorkOnRequest is called for non existing request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await assertRevert(core.cancelWorkOnRequest(underTest, accounts, undefined, core.ID + 1),
        'Did not error when calling cancelWorkOnRequest for non existing request');
  }));
});
