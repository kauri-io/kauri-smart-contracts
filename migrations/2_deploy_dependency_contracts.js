let Community = artifacts.require('Community');
let Wallet = artifacts.require('Wallet');
let KauriCore = artifacts.require('KauriCore');
let KauriReadOperations = artifacts.require('KauriReadOperations');
let KauriWriteOperations = artifacts.require('KauriWriteOperations');
let Storage = artifacts.require('Storage');
let OnlyOwnerAdminController = artifacts.require('OnlyOwnerAdminController');
let Delay = require('./helpers/delay');
let delay = Delay.delay;

module.exports = (deployer) => {

  Delay.init(deployer.chain.network_id);

  deployer.deploy(Storage)
    .then(() => {
      return deployer.deploy(Community);
    })
    .then(() => {
      return deployer.deploy(Wallet);
    })
    .then(() => {
      return deployer.deploy(OnlyOwnerAdminController);
    })
    .then(() => {
      return Storage.deployed();
    })
    .then((deployedStorage) => {
      return delay(() => {
        console.log("Setting admin controller to OnlyOwnerAdminController for Storage contract...")
        return deployedStorage.setAdminController(OnlyOwnerAdminController.address)
          .then(() => delay(() => {
            console.log("Adding Storage write permission for Community...")
            return deployedStorage.addWritePermission(Community.address);
          }));
        });
    })
    .then(() => {
      return Community.deployed();
    })
    .then((deployedCommunity) => {
      return delay(() => {
        console.log("Setting admin controller to OnlyOwnerAdminController for Community contract...")
        return deployedCommunity.setAdminController(OnlyOwnerAdminController.address)
          .then(() => delay(() => {
            console.log("Setting Storage address on Community...");
            return deployedCommunity.setStorageContractAddress(Storage.address);
          }));
        });
    })
    .then(() => {
      return Wallet.deployed();
    })
    .then((deployedWallet) => {
      return delay(() => {
        console.log("Setting admin controller to OnlyOwnerAdminController for Wallet contract...")
        return deployedWallet.setAdminController(OnlyOwnerAdminController.address);
      });
    });
};