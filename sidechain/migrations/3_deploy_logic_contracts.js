let GroupConnector              = artifacts.require('GroupConnector');
let Storage                     = artifacts.require('Storage');
let OnlyOwnerAdminController    = artifacts.require('OnlyOwnerAdminController');

async function performMigration(deployer, network, accounts) {
    let deployedStorage = await Storage.deployed();

    await deployer.deploy(GroupConnector, deployedStorage.address, [2]); // pass storage addr to constructor

    await deployedStorage.addWritePermission(GroupConnector.address);

    let deployedGroup = await GroupConnector.deployed();

    console.log("Setting admin controller to OnlyOwnerAdminController for Group contract...");
    await deployedGroup.setAdminController(OnlyOwnerAdminController.address);

    console.log("Setting storage address on Group...");
    // the below will go into the constructor of Group
     await deployedGroup.setStorageContractAddress(Storage.address); // this doesn't need to happen anymore

    console.log("Group address: " + GroupConnector.address);

    // set roles
    await deployedGroup.setAdditionalRoles([2]);

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
