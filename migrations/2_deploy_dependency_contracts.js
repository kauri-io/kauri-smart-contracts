let Community = artifacts.require('Community');
let Wallet = artifacts.require('Wallet');
let KauriCore = artifacts.require('KauriCore');
let KauriReadOperations = artifacts.require('KauriReadOperations');
let KauriWriteOperations = artifacts.require('KauriWriteOperations');
let Storage = artifacts.require('Storage');
let OnlyOwnerAdminController = artifacts.require('OnlyOwnerAdminController');
let Delay = require('./helpers/delay');
let delay = Delay.delay;

async function performMigration(deployer, network, accounts) {
  Delay.init(deployer.chain.network_id);

  await deployer.deploy(Storage);
  await deployer.deploy(Community);
  await deployer.deploy(Wallet);
  await deployer.deploy(OnlyOwnerAdminController);
  let deployedStorage = await Storage.deployed();
  console.log("Setting admin controller to OnlyOwnerAdminController for Storage contract...")
  await deployedStorage.setAdminController(OnlyOwnerAdminController.address)
  console.log("Adding Storage write permission for Community...")
  await deployedStorage.addWritePermission(Community.address);
  let deployedCommunity = await Community.deployed();
  console.log("Setting admin controller to OnlyOwnerAdminController for Community contract...")
  await deployedCommunity.setAdminController(OnlyOwnerAdminController.address)
  console.log("Setting Storage address on Community...");
  await deployedCommunity.setStorageContractAddress(Storage.address);
  let deployedWallet = await Wallet.deployed();
  console.log("Setting admin controller to OnlyOwnerAdminController for Wallet contract...")
  await deployedWallet.setAdminController(OnlyOwnerAdminController.address);
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
