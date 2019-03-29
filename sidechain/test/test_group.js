const Group = artifacts.require("Group.sol");
const EthUtil = require('ethereumjs-util');
const assertRevert = require('./helpers/assertRevert').assertRevert;

let groupInstance;

let testaccount = accounts[3];
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
        
        let newGroup        = await instance.createGroup(metadataLocator, sig, incorrectNonce);
        let newSequence     = await instance.sequence.call();

        assert.equal(newSequence, 1);
    })
});

async function sign(pk, message) {
    var msgHash = EthUtil.hashPersonalMessage(new Buffer(message));
    var signature = EthUtil.ecsign(msgHash, new Buffer(pk, 'hex'));
    var signatureRPC = EthUtil.toRpcSig(signature.v, signature.r, signature.s);

    return signatureRPC;
};
