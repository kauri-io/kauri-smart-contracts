let Checkpointer = artifacts.require('Checkpointer');
let KauriBounty = artifacts.require('KauriBounty');
let Storage = artifacts.require('Storage');
let OnlyOwnerAdminController = artifacts.require('OnlyOwnerAdminController');
let Delay = require('./helpers/delay');
let delay = Delay.delay;

//KauriCore parameters
let MAX_BOUNTY_CONTRIBUTIONS = 10;
let MODERATION_TIMEOUT = 172800 //2 days in seconds
let MIN_DEADLINE = 259200 //3 days in seconds
let MAX_DEADLINE = 2592000 //30 days in seconds

async function performMigration(deployer, network, accounts) {
  Delay.init(deployer.chain.network_id);

  await deployer.deploy(KauriBounty, MIN_DEADLINE, MAX_DEADLINE);
  let deployedStorage = await Storage.deployed()
  console.log("Adding Storage write permission for KauriBounty...");
  await deployedStorage.addWritePermission(KauriBounty.address);
  let deployedKauriBounty = await KauriBounty.deployed()
  console.log("Setting admin controller to OnlyOwnerAdminController for KauriBounty contract...");
  await deployedKauriBounty.setAdminController(OnlyOwnerAdminController.address)
  await delay()
  console.log("Setting Storage address on KauriBounty...");
  console.log(Storage.address);
  await deployedKauriBounty.setStorageContractAddress(Storage.address);
  await delay()
  console.log("Setting checkpointer address on KauriBounty");
  await deployedKauriBounty.setCheckpointerContractAddress(Checkpointer.address);
  console.log("KauriBounty address: " + KauriBounty.address);
  console.log("Storage address: " + Storage.address);

}

module.exports = function(deployer, network, accounts) {
  deployer
    .then(function() {
      return performMigration(deployer, network, accounts)
    })
    .catch(error => {
      console.log(error)
      process.exit(1)
    })
}
