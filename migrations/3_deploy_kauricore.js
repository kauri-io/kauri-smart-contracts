let Community = artifacts.require('Community');
let Wallet = artifacts.require('Wallet');
let KauriCore = artifacts.require('KauriCore');
let KauriReadOperations = artifacts.require('KauriReadOperations');
let KauriWriteOperations = artifacts.require('KauriWriteOperations');
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

  await deployer.deploy(KauriReadOperations)
  await deployer.link(KauriReadOperations, KauriCore)
  await deployer.deploy(KauriWriteOperations)
  await deployer.link(KauriWriteOperations, KauriCore)
  await deployer.deploy(KauriCore, MAX_BOUNTY_CONTRIBUTIONS, MODERATION_TIMEOUT, MIN_DEADLINE, MAX_DEADLINE);
  let deployedStorage = await Storage.deployed()
  console.log("Adding Storage write permission for KauriCore...");
  await deployedStorage.addWritePermission(KauriCore.address);
  let deployedWallet = await Wallet.deployed()
  await delay()
  console.log("Adding Wallet write permission for KauriCore...")
  await deployedWallet.addWritePermission(KauriCore.address);
  let deployedKauriCore = await KauriCore.deployed()
  console.log("Setting admin controller to OnlyOwnerAdminController for Storage contract...");
  await deployedKauriCore.setAdminController(OnlyOwnerAdminController.address)
  await delay()
  console.log("Setting Wallet address on KauriCore...");
  console.log(Wallet.address);
  await deployedKauriCore.setFundsContractAddress(Wallet.address);
  await delay()
  console.log("Setting Storage address on KauriCore...");
  console.log(Storage.address);
  await deployedKauriCore.setStorageContractAddress(Storage.address);
  await delay()
  console.log("Setting dummy checkpointer address on KauriCore");
  await deployedKauriCore.addCheckpointerAddress(getCheckpointerAddress());
  console.log("KauriCore address: " + KauriCore.address);
  console.log("Community address: " + Community.address);
  console.log("Storage address: " + Storage.address);
  console.log("Wallet address: " + Wallet.address);

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
