let Group                       = artifacts.require('Group');
let Storage                     = artifacts.require('Storage');
let OnlyOwnerAdminController    = artifacts.require('OnlyOwnerAdminController');

async function performMigration(deployer, network, accounts) {
    let deployedStorage = await Storage.deployed();
    await deployer.deploy(Group, [2]); // pass storage addr to constructor
    
    console.log("Adding Storage write permission for Group...");
    await deployedStorage.addWritePermission(Group.address);

    let deployedGroup = await Group.deployed();

    console.log("Setting admin controller to OnlyOwnerAdminController for Group contract...");
    await deployedGroup.setAdminController(OnlyOwnerAdminController.address);

    console.log("Setting storage address on Group...");
    // the below will go into the constructor of Group
    // await deployedGroup.setStorageContractAddress(Storage.address); // this doesn't need to happen anymore 
    
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
