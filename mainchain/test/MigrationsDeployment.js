/**
 * A single test, progressing an article into an accepted state without any deployment.
 * Tests that the migrations script is configured correctly.
 */
const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const increaseTime = require('./helpers/time').increaseTime;
const core = require('./helpers/core');

var KauriCore = artifacts.require('KauriCore.sol');
var Community = artifacts.require('Community.sol');

contract('MigrationsDeployment', function(accounts) {

  it('Progress to accepted article', async () => {
    let kauriCore = await KauriCore.deployed();
    let community = await Community.deployed();

    //TODO This probably shouldn't go here
    await kauriCore.addCheckpointerAddress(accounts[8], {from: accounts[0]});

    await core.createCommunity(community, accounts);
    await core.addRequestAndFulfil(kauriCore, accounts);
  });
});