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
    console.log('tipArticle(): ', tipArticleGas);
  });

  it('tipArticle() gas used', core.redeployNoMocks(accounts, async (underTest) => {
    let checkpoint = await core.checkpointArticles(underTest, accounts);
    let tx = await core.tipArticle(underTest, accounts, checkpoint);
    tipArticleGas = getGasUsed(tx);
  }));

});

function getGasUsed(tx) {
  assert(tx);
  return tx.receipt.gasUsed;
}