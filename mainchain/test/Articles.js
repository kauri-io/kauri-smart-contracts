const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const getEvents = require('./helpers/getEvents').getEvents;

contract('Articles', function(accounts) {

  it('should allow anyone to tip an article once an article has been accepted', core.redeploy(accounts, async (underTest) => {
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    await core.tipArticle(underTest, accounts, returned.checkpoint);
  }));

  it('should fire a ArticleTipped event once a article has been tipped', core.redeploy(accounts, async (underTest) => {
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    await core.tipArticle(underTest, accounts, returned.checkpoint);



    let tipped = underTest.getPastEvents('ArticleTipped',{fromBlock: 0, toBlock: 'latest'})
    let logs = await getEvents(tipped)
    let expectedRequestId = core.ID;

    assert.equal(web3.utils.hexToUtf8(logs[0].args.articleId), web3.utils.hexToUtf8(core.ARTICLE_ID), 'Article Id incorrect');
    assert.equal(logs[0].args.creator, accounts[2], 'Submitted incorrect');
    assert.equal(logs[0].args.tipper, accounts[3], 'Tipper incorrect');
    assert.equal(logs[0].args.tipAmount, 1000000, 'Tip amount incorrect');
    assert.equal(logs[0].args.articleVersion, core.BASE_VERSION, 'Article version incorrect');
  }));

  it('should send the tip value to the funds contract', core.redeploy(accounts, async (underTest, mockFundable) => {
    await doTipValueTransferTest(underTest, accounts, mockFundable);
  }));

  it('should send the tip value to the funds contract (partially wallet funded)', core.redeploy(accounts, async (underTest, mockFundable) => {
    await doTipValueTransferTest(underTest, accounts, mockFundable, 500000);
  }));

  async function doTipValueTransferTest(underTest, accounts, mockFundable, valueToSend) {
    if (typeof valueToSend === "undefined") {valueToSend = 1000000};
    await core.setAvailableFunds(mockFundable, accounts[3], 1000000);
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    await core.tipArticle(underTest, accounts, returned.checkpoint, 1000000, core.ARTICLE_ID, accounts[2], valueToSend);
    assert.equal(await web3.eth.getBalance(mockFundable.address), core.BOUNTY + valueToSend);
  }

  it('should increase the available funds for tip recipient in the funds contract', core.redeploy(accounts, async (underTest, mockFundable) => {
    await doTipThenArticleCreatorFundsIncreaseTest(underTest, accounts, mockFundable);
  }));

  it('should increase the available funds for tip recipient in the funds contract (partially wallet funded)', core.redeploy(accounts, async (underTest, mockFundable) => {
    await doTipThenArticleCreatorFundsIncreaseTest(underTest, accounts, mockFundable, 500000);
  }));

  it('should increase the available funds for tip recipient in the funds contract (fully wallet funded)', core.redeploy(accounts, async (underTest, mockFundable) => {
    await doTipThenArticleCreatorFundsIncreaseTest(underTest, accounts, mockFundable, 0);
  }));

  async function doTipThenArticleCreatorFundsIncreaseTest(underTest, accounts, mockFundable, valueToSend) {
    let expectedInvocationCount = 2;

    await core.setAvailableFunds(mockFundable, accounts[3], 1000000);
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    await core.tipArticle(underTest, accounts, returned.checkpoint, 1000000, core.ARTICLE_ID, accounts[2], valueToSend);
    await core.checkAvailableFundsIncrease(accounts[2], 1000000, mockFundable, expectedInvocationCount, expectedInvocationCount - 1);
  }

  it('should decrease available funds for tipper when funded from wallet (partially wallet funded)', core.redeploy(accounts, async (underTest, mockFundable) => {
    await doWalletFundedTipFundsDecreaseTest(underTest, accounts, mockFundable, 500000);
  }));

  it('should decrease available funds for tipper when funded from wallet (fully wallet funded)', core.redeploy(accounts, async (underTest, mockFundable) => {
    await doWalletFundedTipFundsDecreaseTest(underTest, accounts, mockFundable, 0);
  }));

  async function doWalletFundedTipFundsDecreaseTest(underTest, accounts, mockFundable, valueToSend) {
    await core.setAvailableFunds(mockFundable, accounts[3], 1000000);
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    await core.tipArticle(underTest, accounts, returned.checkpoint, 1000000, core.ARTICLE_ID, accounts[2], valueToSend);
    await core.checkAvailableFundsDecrease(accounts[3], 1000000 - valueToSend, mockFundable, 1, 0);
  }

  it('should not allow a transaction to tipArticle with zero tip amount', core.redeploy(accounts, async (underTest) => {
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    await assertRevert(core.tipArticle(underTest, accounts, returned.checkpoint, 0),
        'Allowed a call to tipArticle without a tip amount');
  }));

  it('should not allow article to be tipped if the tipper cant afford tip amount', core.redeploy(accounts, async (underTest, mockFundable) => {
    await core.setAvailableFunds(mockFundable, accounts[3], 1000000);
    let returned = await core.addRequestAndFulfil(underTest, accounts);
    await assertRevert(core.tipArticle(underTest, accounts, returned.checkpoint, 2000000, core.ARTICLE_ID, accounts[2], 500000),
        'Allowed a call to tipArticle when value cant be afforded');
  }));

});

async function verifyPublishedEvent(underTest, accounts, standalone, expectedVersion) {
  var published = underTest.ArticlePublished({fromBlock: 0, toBlock: 'latest'});
  let logs = await getEvents(published);

  //expect blank request id for standalone
  let expectedRequestId = core.ID;
  if (standalone) {
    expectedRequestId = '';
  }
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
