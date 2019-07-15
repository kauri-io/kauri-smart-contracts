const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;

contract('RequestRefunding', function(accounts) {
  it('should not refund request if deadline has not passed', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await increaseTime(core.SECONDS_IN_WEEK - 60);
    await assertRevert(core.refundRequest(underTest, accounts),
        'Did not error when calling refundRequest when deadline not exceeded');
   }));

   it('should not refund request in publication period', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await increaseTime(core.SECONDS_IN_WEEK + core.PUBLICATION_PERIOD - 60);
    await assertRevert(core.refundRequest(underTest, accounts),
        'Did not error when calling refundRequest when deadline not exceeded');
   }));

   it('should set request status to REFUNDED if deadline is exceeded and publication period has past', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await core.refundRequest(underTest, accounts);
    let requestDetails = await core.getRequest(underTest, accounts);
    assert.equal(requestDetails[1], 3, 'Status not changed to refunded');
  }));

  it('should fire a RequestRefunded event when a request is refunded', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await core.refundRequest(underTest, accounts);
    let refunded = underTest.getPastEvents('RequestRefunded',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(refunded);
    assert.equal(web3.utils.hexToUtf8(logs[0].args.id), web3.utils.hexToUtf8(core.ID), 'Id incorrect');
    assert.equal(logs[0].args.creator, accounts[1], 'Creator incorrect');
  }));

  it('should add available funds for creator equal to initial bounty if refunded', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await core.refundRequest(underTest, accounts);
    await core.checkAvailableFundsIncrease(accounts[1], core.BOUNTY, mockFundable, 1, 0);
  }));

  it('should add available funds for creator and additional bounties if refunded', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.addRequest(underTest, accounts);
    await core.addToBounty(underTest, accounts, accounts[2], core.ID, 50000, 50000);
    await core.addToBounty(underTest, accounts, accounts[3], core.ID, 70000, 70000);
    await core.increaseTimeToPastPublicationPeriod();
    await core.refundRequest(underTest, accounts);
    await core.checkAvailableFundsIncrease(accounts[1], core.BOUNTY, mockFundable, 3, 0);
    await core.checkAvailableFundsIncrease(accounts[2], 50000, mockFundable, 3, 1);
    await core.checkAvailableFundsIncrease(accounts[3], 70000, mockFundable, 3, 2);
  }));

  it('should not refund request if deadline has passed but a request has been accepted', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await assertRevert(core.refundRequest(underTest, accounts),
        'Refunded when deadline passed but an article has been accepted');
  }));

  it('should not refund request if deadline + publication has passed but a request has been accepted', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    await assertRevert(core.refundRequest(underTest, accounts),
        'Refunded when deadline passed but an article has been accepted');
  }));
});
