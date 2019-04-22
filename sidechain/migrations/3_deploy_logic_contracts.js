let GroupConnector              = artifacts.require('GroupConnector.sol');
let Storage                     = artifacts.require('Storage');
let OnlyOwnerAdminController    = artifacts.require('OnlyOwnerAdminController');

async function performMigration(deployer, network, accounts) {
    let deployedStorage = await Storage.deployed();
    await deployer.deploy(GroupConnector, [2]); // pass storage addr to constructor

    console.log("Adding Storage write permission for Group...");
    await deployedStorage.addWritePermission(GroupConnector.address);

    let deployedGroup = await GroupConnector.deployed();

    console.log("Setting admin controller to OnlyOwnerAdminController for Group contract...");
    await deployedGroup.setAdminController(OnlyOwnerAdminController.address);

    console.log("Setting storage address on Group...");
    await deployedGroup.setStorageContractAddress(Storage.address);

    console.log("Group address: " + GroupConnector.address);

    await deployedGroup.addRoles([2]);
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
