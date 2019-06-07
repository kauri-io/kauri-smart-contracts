let Checkpointer = artifacts.require('Checkpointer');
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

  await deployer.deploy(Checkpointer);
  let deployedStorage = await Storage.deployed()
  console.log("Adding Storage write permission for Checkpointer...");
  await deployedStorage.addWritePermission(Checkpointer.address);
  let deployedCheckpointer = await Checkpointer.deployed()
  console.log("Setting admin controller to OnlyOwnerAdminController for Checkpointer contract...");
  await deployedCheckpointer.setAdminController(OnlyOwnerAdminController.address)
  await delay()
  console.log("Setting Storage address on Checkpointer...");
  console.log(Storage.address);
  await deployedCheckpointer.setStorageContractAddress(Storage.address);
  await delay()
  console.log("Setting dummy checkpointer address on Checkpointer");
  await deployedCheckpointer.addCheckpointerAddress(getCheckpointerAddress());
  console.log("Checkpointer address: " + Checkpointer.address);
  console.log("Storage address: " + Storage.address);

}

function getCheckpointerAddress() {
  let checkpointerAddress = process.env.CHECKPOINTER_ADDRESS;
  if (!checkpointerAddress) {
    checkpointerAddress = "0x1a8dece37dfc3c2f7416e125397b600ed04f19dc"
  }

  console.log("Checkpointer address: " + checkpointerAddress)

  return checkpointerAddress;
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
