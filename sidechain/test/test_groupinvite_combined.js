// TODO: COMMON interface updating and testing

'use strict';
(async () => { // 'accounts' included so maybe it'll retrieve accounts[n]

    const Group                 = artifacts.require("Group.sol");
    const Storage               = artifacts.require("Storage.sol");
    const AdminController       = artifacts.require("OnlyOwnerAdminController.sol");

    const catchRevert           = require('./exceptions.js').catchRevert;
    const EthUtil               = require('ethereumjs-util');
    const ipfsHash              = require('./helpers/ipfsHash');
    const getEvents             = require('./helpers/getEvents').getEvents;

    const IPFS_HASH             = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    const METADATA_HASH         = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);

    let groupInstance;
    let storageInstance;
    let adminController;

    // roles
    const groupId               = 0;
    const adminRole             = 1;
    const subordinateRole       = 2;
    
    // secrets to hash
    const secret                = '0x1337';
    const secret2               = '0x7331';
    const secret3               = '0x9999';

    contract('Group', async accounts => {

        beforeEach(async () => {
            storageInstance     = await Storage.new();
            groupInstance       = await Group.new([2]);
            adminController     = await AdminController.new();

            await storageInstance.setAdminController(adminController.address);
            await groupInstance.setAdminController(adminController.address);
            await groupInstance.setStorageContractAddress(storageInstance.address);
            await storageInstance.addWritePermission(groupInstance.address);

        });

        it('should create a group with 3 invitation', async () => {
            let newGroup        = await stageNewGroup(accounts[0]);
        });

        async function getNonce(addr) {
            let nonce = await groupInstance.getNonce.call(addr);
            return nonce;
        };

        async function prepAndRevokeInvitation(addr) {
            let secretHash      = await groupInstance.getKeccak(secret);

            let prepRevoke      = await groupInstance.prepareRevokeInvitation(
                groupId,
                secretHash,
                await getNonce(addr)
            );

            let sig             = await web3.eth.sign(
                prepRevoke, 
                web3.utils.toChecksumAddress(addr)
            );

            let revokeInv       = await groupInstance.revokeInvitation(
                groupId,
                secretHash,
                sig,
                await groupInstance.getNonce(addr)
            );

            return prepRevoke;

        };

        async function stageNewGroup(adminAddr) {
            // TODO: make a standalone keccak function that's not in contract
            let secretHash1     = await groupInstance.getKeccak(secret);
            let secretHash2     = await groupInstance.getKeccak(secret2);
            let secretHash3     = await groupInstance.getKeccak(secret3);

            let shArray         = [secretHash1, secretHash2, secretHash3];
            let rolesArray      = [1, 1, 1];
            let noncesArray     = [0, 0, 0];

            //let shArray         = [];
            //let rolesArray      = [];
            //let noncesArray     = [];
            
            let nonce           = await getNonce(adminAddr);
            let msgHash         = await groupInstance.prepareCreateGroup(
                METADATA_HASH, 
                nonce
            );
            let sig             = await web3.eth.sign(
                msgHash, 
                web3.utils.toChecksumAddress(adminAddr)
            );
            let newGroup        = await groupInstance.createGroup(
                adminAddr,
                METADATA_HASH, 
                // sig, 
                // nonce
                shArray,
                rolesArray,
                noncesArray
            );

            return newGroup;
        };

    });   

})();
