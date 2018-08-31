const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;

contract('RequestUpdating', function(accounts) {
  it('should allow the creator of a request to update request if not being worked on', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.updateRequest(underTest, accounts);
  }));
 
  it('should error if request update attempted when someone is working on request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.startWorkOnRequest(underTest, accounts);
    await assertRevert(core.updateRequest(underTest, accounts),
        'Contract did not throw when updating WORK_IN_PROGRESS request when voting disabled');
  }));
 
  it('should allow the creator of a request to update after work on request is cancelled', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts); 
    await core.startWorkOnRequest(underTest, accounts, accounts[2]);
    await core.startWorkOnRequest(underTest, accounts, accounts[3]);
    await core.cancelWorkOnRequest(underTest, accounts, accounts[3]);
    await core.cancelWorkOnRequest(underTest, accounts, accounts[2]);
    await core.updateRequest(underTest, accounts);
   }));
 
  it('should not update content if 0x0 passed in', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await assertRevert(core.updateRequest(underTest, accounts, undefined, undefined, 0x0),
        'Updated content to 0x0');
  }));
 
  it('should fire a RequestUpdated event when request updated', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.updateRequest(underTest, accounts);
    let updated = underTest.RequestUpdated({fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(updated);
    assert.equal(toAscii(logs[0].args.id), core.ID, 'Id not correct on updated event');
    assert.equal(logs[0].args.contentHash, core.UPDATED_CONTENT_HASH, 'Content hash not correct on event');
  }));
 
  it('should error if attempting to update a non existent request', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await assertRevert(core.updateRequest(underTest, accounts, undefined, core.ID + 1),
        'Allowed update of non existent request');
  }));
 
  it('should error if non-creator attempts to update request content', core.redeploy(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await assertRevert(core.updateRequest(underTest, accounts, accounts[2]),
        'Allowed update by non-creator account');
  }));
 
  it('should error if attempting to update an ACCEPTED request', core.redeploy(accounts, async (underTest) => {
    await core.addRequestAndFulfil(underTest, accounts);
    await assertRevert(core.updateRequest(underTest, accounts),
        'Allowed update in ACCEPTED state');
  }));
});