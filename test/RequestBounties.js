const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;

contract('RequestBounties', function(accounts) {
  it('should allow any user to add to the bounty of a request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.addToBounty(underTest, accounts, undefined, undefined, 50000, 50000);
  }));
 
  it('should send added bounty value to funds contract', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.addRequest(underTest, accounts);
    await core.addToBounty(underTest, accounts, undefined, undefined, 50000, 50000);
    assert.equal(web3.eth.getBalance(mockFundable.address), core.BOUNTY + 50000);
  }));
 
  it('should fire a BountyAdded event when a bounty is added', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.addToBounty(underTest, accounts, undefined, undefined, 50000, 50000);
    let bountyAdded = underTest.BountyAdded({fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(bountyAdded);
    assert.equal(toAscii(logs[0].args.requestId), core.ID, 'Id incorrect');
    assert.equal(logs[0].args.addedAmount, 50000, 'Added amount incorrect');
    assert.equal(logs[0].args.newTotal, core.BOUNTY + 50000, 'New total incorrect');
  }));
 
  it('should fail if addToBounty is called without any ether and no available funds', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await assertRevert(core.addToBounty(underTest, accounts, undefined, undefined, 50000, 0),
        'addToBounty call did not fail when no ether is sent');
  }));
 
  it('should fail if addToBounty is called in moderation period', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await assertRevert(core.addToBounty(underTest, accounts, undefined, undefined, 50000, 50000),
        'addToBounty call did not fail when in moderation period');
 }));
 
 it('should fail if addBounty is called for accepted request', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);
    await assertRevert(core.addToBounty(underTest, accounts, undefined, undefined, 50000, 50000),
        'addToBounty call did not fail for accepted request');
 }));
 
 it('should fail if addBounty is called for refunded request', core.redeploy(accounts, async (underTest) => {
  await core.addRequest(underTest, accounts);
  await core.increaseTimeToPastPublicationPeriod();
  await core.refundRequest(underTest, accounts);
  await assertRevert(core.addToBounty(underTest, accounts, undefined, undefined, 50000, 50000),
      'addToBounty call did not fail for refunded request');
 }));
 
 it('addToBounty should deduct from available balance if bounty is more than msg.value', core.redeploy(accounts, async (underTest, mockFundable) => {
  await core.setAvailableFunds(mockFundable, accounts[3], 30000);
  await core.addRequest(underTest, accounts);
  await core.addToBounty(underTest, accounts, undefined, undefined, 70000, 50000)
  await core.checkAvailableFundsDecrease(accounts[3], 20000, mockFundable);
 }));
 
 it('addToBounty should deduct from available balance if msg.value is zero', core.redeploy(accounts, async (underTest, mockFundable) => {
  await core.setAvailableFunds(mockFundable, accounts[3], 60000);
  await core.addRequest(underTest, accounts);
  await core.addToBounty(underTest, accounts, undefined, undefined, 50000, 0);
  await core.checkAvailableFundsDecrease(accounts[3], 50000, mockFundable);
 }));
 
 it('addToBounty should error if value and available funds is less than bounty', core.redeploy(accounts, async (underTest, mockFundable) => {
  await core.setAvailableFunds(mockFundable, accounts[1], 30000);
  await core.addRequest(underTest, accounts);
  await assertRevert(core.addToBounty(underTest, accounts, undefined, undefined, 50000, 10000),
      'Didnt error when bounty exceeded funds');
 }));
 
 it('addToBounty should error if value is greater than bounty', core.redeploy(accounts, async (underTest, mockFundable) => {
  await core.addRequest(underTest, accounts);
  await assertRevert(core.addToBounty(underTest, accounts, undefined, undefined, 50000, 60000),
      'Didnt error when value exceeds bounty');
 }));
});