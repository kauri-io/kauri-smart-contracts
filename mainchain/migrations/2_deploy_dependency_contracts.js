let Storage = artifacts.require('Storage');
let OnlyOwnerAdminController = artifacts.require('OnlyOwnerAdminController');
let Delay = require('./helpers/delay');
let delay = Delay.delay;

async function performMigration(deployer, network, accounts) {
  Delay.init(deployer.chain.network_id);

  await deployer.deploy(Storage);
  await deployer.deploy(OnlyOwnerAdminController);
  let deployedStorage = await Storage.deployed();
  console.log("Setting admin controller to OnlyOwnerAdminController for Storage contract...")
  await deployedStorage.setAdminController(OnlyOwnerAdminController.address)
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
