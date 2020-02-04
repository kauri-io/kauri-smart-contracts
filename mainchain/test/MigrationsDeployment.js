/**
 * A single test, progressing an article into an accepted state without any deployment.
 * Tests that the migrations script is configured correctly.
 */
const fromAscii = require('./helpers/ascii').fromAscii;
const core = require('./helpers/core');

var KauriCheckpoint = artifacts.require('KauriCheckpoint.sol');

contract('MigrationsDeployment', function(accounts) {

  it('Progress to accepted article', async () => {
    let kauriCheckpoint = await KauriCheckpoint.deployed();

    //TODO This probably shouldn't go here
    await kauriCheckpoint.addCheckpointerAddress(accounts[8], {from: accounts[0]});

    await core.checkpointArticles(kauriCheckpoint, accounts);
  });
});