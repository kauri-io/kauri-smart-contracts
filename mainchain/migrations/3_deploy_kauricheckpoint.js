let KauriCheckpoint = artifacts.require('KauriCheckpoint');
let KauriReadOperations = artifacts.require('KauriReadOperations');
let KauriWriteOperations = artifacts.require('KauriWriteOperations');
let Storage = artifacts.require('Storage');
let OnlyOwnerAdminController = artifacts.require('OnlyOwnerAdminController');
let Delay = require('./helpers/delay');
let delay = Delay.delay;

async function performMigration(deployer, network, accounts) {
  Delay.init(deployer.chain.network_id);

  await deployer.deploy(KauriReadOperations)
  await deployer.link(KauriReadOperations, KauriCheckpoint)
  await deployer.deploy(KauriWriteOperations)
  await deployer.link(KauriWriteOperations, KauriCheckpoint)
  await deployer.deploy(KauriCheckpoint);
  let deployedStorage = await Storage.deployed()
  console.log("Adding Storage write permission for KauriCheckpoint...");
  await deployedStorage.addWritePermission(KauriCheckpoint.address);
  await delay()
  let deployedKauriCheckpoint = await KauriCheckpoint.deployed()
  console.log("Setting admin controller to OnlyOwnerAdminController for Storage contract...");
  await deployedKauriCheckpoint.setAdminController(OnlyOwnerAdminController.address)
  await delay()
  console.log("Setting Storage address on deployedKauriCheckpoint...");
  console.log(Storage.address);
  await deployedKauriCheckpoint.setStorageContractAddress(Storage.address);
  await delay()
  console.log("Setting dummy checkpointer address on KauriCheckpoint");
  await deployedKauriCheckpoint.addCheckpointerAddress(getCheckpointerAddress());
  console.log("KauriCheckpoint address: " + KauriCheckpoint.address);
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
