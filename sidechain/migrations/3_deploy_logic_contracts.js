let Group                       = artifacts.require('Group');
let Storage                     = artifacts.require('Storage');
let OnlyOwnerAdminController    = artifacts.require('OnlyOwnerAdminController');

async function performMigration(deployer, network, accounts) {
    await deployer.deploy(Group, [2]);
    
    let deployedStorage = await Storage.deployed();

    console.log("Adding Storage write permission for Group...");
    await deployedStorage.addWritePermission(Group.address);

    let deployedGroup = await Group.deployed();

    console.log("Setting admin controller to OnlyOwnerAdminController for Group contract...");
    await deployedGroup.setAdminController(OnlyOwnerAdminController.address);

    console.log("Setting storage address on Group...");
    await deployedGroup.setStorageContractAddress(Storage.address);
    
    console.log("Group address: " + Group.address);
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
