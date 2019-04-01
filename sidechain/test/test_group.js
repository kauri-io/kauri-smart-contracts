const Group = artifacts.require("./group/Group.sol");
const Storage = artifacts.require("./storage/Storage.sol");
const AdminController = artifacts.require("./permissions/OnlyOwnerAdminController.sol");

const catchRevert = require('./exceptions.js').catchRevert;
const EthUtil =     require('ethereumjs-util');
const ipfsHash =    require('./helpers/ipfsHash');
const getEvents =   require('./helpers/getEvents').getEvents;

const IPFS_HASH = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
const METADATA_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);

let groupInstance;

let testprivkey = 'bf39003e4f743a750efeb7a230aa551dca1dda0c359e9e50dc3a4fc8275f7f8c'; // accounts[3] ganache-cli

contract('Group', async accounts => {

    it('should create a group', async () => {
        let metadataLocator = web3.utils.toHex('1337'); // add actual IPFS hash
        let nonce           = 0;

        let instance        = await Group.deployed();
        let hash            = await instance.prepareCreateGroup(metadataLocator, nonce);
        let sig             = await sign(testprivkey, hash);
        
        let newGroup        = await instance.createGroup(metadataLocator, sig, nonce);
        let newSequence     = await instance.sequence.call();

        assert.equal(newSequence, 1);
    });

    it('should fail to create a group because of incorrect nonce', async () => {
        let metadataLocator = web3.utils.toHex('1337'); // add actual IPFS hash
        let incorrectNonce  = 1;

        let instance        = await Group.deployed();
        let hash            = await instance.prepareCreateGroup(metadataLocator, incorrectNonce);
        let sig             = await sign(testprivkey, hash);
        
        await catchRevert(instance.createGroup(metadataLocator, sig, incorrectNonce));
    })

    it('should emit a GroupCreated event after group creation', redeploy(accounts[0], async(underTest) => {

        let metadataLocator = web3.utils.toHex('1337');
        let nonce           = 0;

        let hash            = await instance.prepareCreateGroup(metadataLocator, incorrectNonce);
        let sig             = await sign(testprivkey, hash);

        let newGroup = await underTest.createGroup(metadataLocator, sig, nonce);

        var created = underTest.getPastEvents

    }));
});

function redeploy(deployer, testFunction) {
    var wrappedFunction = async () => {
        let storageContract = await Storage.new({ from:deployer });
        let groupContract = await Group.new({ from:deployer });
        let adminController = await AdminController.new({ from:deployer });

        await storageContract.setAdminController(adminController.address, { from: deployer });
        await groupContract.setAdminController(adminController.address, { from: deployer });

        await groupContract.setStorageContractAddress(storageContract.address, { from: deployer });
        await storageContract.addWritePermission(groupContract.address, { from: deployer });

        await testFunction(storageContract);
    };

    return wrappedFunction;
}

async function sign(pk, message) {
    var msgHash = EthUtil.hashPersonalMessage(new Buffer(message));
    var signature = EthUtil.ecsign(msgHash, new Buffer(pk, 'hex'));
    var signatureRPC = EthUtil.toRpcSig(signature.v, signature.r, signature.s);

    return signatureRPC;
};

