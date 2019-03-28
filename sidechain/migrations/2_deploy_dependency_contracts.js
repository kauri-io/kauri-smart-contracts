var Group = artifacts.require('Group');
var Storage = artifacts.require('Storage');

module.exports = function(deployer) {
    deployer.deploy(Group, [0, 1]);
    deployer.deploy(Storage);
}

