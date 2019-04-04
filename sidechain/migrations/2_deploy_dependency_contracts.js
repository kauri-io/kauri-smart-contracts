let Group = artifacts.require('Group');
let Storage = artifacts.require('Storage');
let OnlyOwnerAdminController = artifacts.require('OnlyOwnerAdminController');

async function performMigration(deployer, network, accounts) {
    await deployer.deploy(Storage);
    await deployer.deploy(OnlyOwnerAdminController);

    let deployedStorage = await Storage.deployed();

    console.log("Setting admin controller to OnlyOwnerAdminController for Storage contract...");
    await deployedStorage.setAdminController(OnlyOwnerAdminController.address);
};

module.exports = function(deployer, network, accounts) {
    deployer
        .then(function() {
            return performMigration(deployer, network, accounts)
        })
        .catch(error => {
            console.log(error)
            process.exit(1)
        })
};
