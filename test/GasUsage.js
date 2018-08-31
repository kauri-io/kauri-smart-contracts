const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');

let addRequestGas;
let updateRequestGas;
let addToBountyGas;
let startWorkOnRequestGas;
let cancelWorkOnRequestGas;
let refundRequestGas;
let refundRequestThreeBountiesGas;
let fulfilRequestGas;
let updateArticleGas;
let tipArticleGas;

contract('GasUsage', function(accounts) {
  after(async () => {
    console.log('******** GAS USAGE ********');
    console.log('addRequest(): ' + addRequestGas);
    console.log('updateRequest(): ' + updateRequestGas);
    console.log('addToBounty(): ' + addToBountyGas);
    console.log('startWorkOnRequest(): ' + startWorkOnRequestGas);
    console.log('cancelWorkOnRequest(): ', cancelWorkOnRequestGas);
    console.log('refundRequest() single bounty: ', refundRequestGas);
    console.log('refundRequest() three bounties: ', refundRequestThreeBountiesGas);
    console.log('fulfilRequest(): ', fulfilRequestGas);
    console.log('tipArticle(): ', tipArticleGas);
  });

  it('addRequest gas used', core.redeployNoMocks(accounts, async (underTest) => {
    let tx = await core.addRequest(underTest, accounts);
    addRequestGas = getGasUsed(tx);
  }));

  it('updateRequest gas used', core.redeployNoMocks(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let tx = await underTest.updateRequest(core.ID, core.UPDATED_CONTENT_HASH, {from: accounts[1]});
    updateRequestGas = getGasUsed(tx);
  }));

  it('addToBounty gas used', core.redeployNoMocks(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let tx = await underTest.addToBounty(core.ID, 50000, {from: accounts[3], value: 50000});
    addToBountyGas = getGasUsed(tx);
  }));

  it('startWorkOnRequest() gas used', core.redeployNoMocks(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    let tx = await underTest.startWorkOnRequest(core.ID, {from: accounts[2]});
    startWorkOnRequestGas = getGasUsed(tx);
  }));

  it('cancelWorkOnRequest() gas used', core.redeployNoMocks(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await underTest.startWorkOnRequest(core.ID, {from: accounts[2]});
    let tx = await underTest.cancelWorkOnRequest(core.ID, {from: accounts[2]});
    cancelWorkOnRequestGas = getGasUsed(tx);
  }));

  it('fulfilRequest() gas used', core.redeployNoMocks(accounts, async (underTest) => {
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    fulfilRequestGas = getGasUsed(returned.tx);
  }));

  it('tipArticle() gas used', core.redeployNoMocks(accounts, async (underTest) => {
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    let tx = await core.tipArticle(underTest, accounts, returned.checkpoint);
    tipArticleGas = getGasUsed(tx);
  }));

  it('refundRequest() gas used (single bounty)', core.redeployNoMocks(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await core.increaseTimeToPastPublicationPeriod();
    let tx = await underTest.refundRequest(core.ID, {from: accounts[1]});
    refundRequestGas = getGasUsed(tx);
  }));

  it('refundRequest() gas used (three bounties)', core.redeployNoMocks(accounts, async (underTest) => {
    await core.addRequest(underTest, accounts);
    await underTest.addToBounty(core.ID, 50000, {from: accounts[2], value: 50000}); 
    await underTest.addToBounty(core.ID, 70000, {from: accounts[3], value: 70000});
    await core.increaseTimeToPastPublicationPeriod();
    let tx = await underTest.refundRequest(core.ID, {from: accounts[1]});
    refundRequestThreeBountiesGas = await getGasUsed(tx);
  }));

});

function getGasUsed(tx) {
  assert(tx);
  return tx.receipt.gasUsed;
}