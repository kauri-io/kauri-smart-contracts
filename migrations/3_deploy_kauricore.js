let DELAY = 0;

let Community = artifacts.require('Community');
let Wallet = artifacts.require('Wallet');
let KauriCore = artifacts.require('KauriCore');
let KauriReadOperations = artifacts.require('KauriReadOperations');
let KauriWriteOperations = artifacts.require('KauriWriteOperations');
let Storage = artifacts.require('Storage');
let OnlyOwnerAdminController = artifacts.require('OnlyOwnerAdminController');

//KauriCore parameters
let MAX_BOUNTY_CONTRIBUTIONS = 10;
let MODERATION_TIMEOUT = 172800 //2 days in seconds
let MIN_DEADLINE = 259200 //3 days in seconds
let MAX_DEADLINE = 2592000 //30 days in seconds

module.exports = (deployer) => {
  
  //Add a delay for rinkeby to overcome infura load balancing issue
  //https://github.com/trufflesuite/truffle/issues/763
  console.log(deployer.chain.networkId);
  if (deployer.chain.networkId == 4) {
    DELAY = 10000;
  }
  
  deployer.deploy(KauriReadOperations)
    .then(() => { return deployer.link(KauriReadOperations, KauriCore) })
    .then(() => { return deployer.deploy(KauriWriteOperations) })
    .then(() => { return deployer.link(KauriWriteOperations, KauriCore) })
    .then(() => {
          return deployer.deploy(KauriCore, MAX_BOUNTY_CONTRIBUTIONS, MODERATION_TIMEOUT, MIN_DEADLINE, MAX_DEADLINE);
    })
    .then(() => { return Storage.deployed() })
    .then((deployedStorage) => {
      return delay(() => {
        console.log("Adding Storage write permission for KauriCore...");
        return deployedStorage.addWritePermission(KauriCore.address);
      });
    })
    .then(() => { return Wallet.deployed() })
    .then((deployedWallet) => {
      return delay(() => {
        console.log("Adding Wallet write permission for KauriCore...")
        return deployedWallet.addWritePermission(KauriCore.address);
      });
    })
    .then(() => { return KauriCore.deployed() })
    .then((deployedKauriCore) => {
      console.log("Setting admin controller to OnlyOwnerAdminController for Storage contract...");
      return deployedKauriCore.setAdminController(OnlyOwnerAdminController.address)
        .then(() => delay(() => {
          console.log("Setting Community address on KauriCore...");
          console.log(Community.address);
          return deployedKauriCore.setCommunityContractAddress(Community.address)
        }))
        .then(() => delay(() => {
          console.log("Setting Wallet address on KauriCore...");
          console.log(Wallet.address);
          return deployedKauriCore.setFundsContractAddress(Wallet.address);
        }))
        .then(() => delay(() => {
          console.log("Setting Storage address on KauriCore...");
          console.log(Storage.address);
          return deployedKauriCore.setStorageContractAddress(Storage.address);
        }))
        .then(() => delay(() => {
          console.log("!!!!!!!UPDATE...Setting dummy checkpointer address on KauriCore...UPDATE!!!!!!!");
          return deployedKauriCore.addCheckpointerAddress("0x00a329c0648769a73afac7f9381e08fb43dbea72");
        }))
    })
    .then(() => {
      //Output all deployed contract addresses
      console.log("KauriCore address: " + KauriCore.address);
      console.log("Community address: " + Community.address);
      console.log("Storage address: " + Storage.address);
      console.log("Wallet address: " + Wallet.address);
    });
};

function delay(func) {
  return new Promise(resolve => setTimeout(resolve, DELAY))
    .then(func);
}