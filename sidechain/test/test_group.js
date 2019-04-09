'use strict';
(async () => {

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

        it('should create a group', async () => {
            let nonce           = await groupInstance.nonces.call(accounts[0]);
            let hash            = await groupInstance.prepareCreateGroup(METADATA_HASH, nonce);
            let sig             = await web3.eth.sign(hash, web3.utils.toChecksumAddress(accounts[0]));
            let newGroup        = await groupInstance.createGroup(METADATA_HASH, sig, nonce);

        });

        it('should retrieve the correct nonce', async () => {
            let retrieveNonce   = await groupInstance.nonces.call(accounts[0]);

            assert.equal(
                retrieveNonce, 
                0
            );

            let nonce = await groupInstance.nonces.call(accounts[0]);
            let hash            = await groupInstance.prepareCreateGroup(
                METADATA_HASH, 
                nonce 
            );

            let sig             = await web3.eth.sign(hash, web3.utils.toChecksumAddress(accounts[0]));
            let newGroup        = await groupInstance.createGroup(
                METADATA_HASH, 
                sig, 
                nonce,
                { from: accounts[0] }
            );

            let retrieveNewNonce = await groupInstance.nonces.call(accounts[0]);

            assert.equal(
                retrieveNewNonce.toNumber(),
                1
            );

        });

        it('should fail to create a group because of incorrect nonce', async () => {
            let incorrectNonce  = 1;
            let hash            = await groupInstance.prepareCreateGroup(METADATA_HASH, incorrectNonce);
            let sig             = await web3.eth.sign(hash, web3.utils.toChecksumAddress(accounts[0]));

            await catchRevert(groupInstance.createGroup(METADATA_HASH, sig, incorrectNonce));
        });

        it('should emit a GroupCreated event after group creation', async () => {
            let nonce           = await groupInstance.nonces.call(accounts[0]);
            let hash            = await groupInstance.prepareCreateGroup(METADATA_HASH, nonce);
            let sig             = await web3.eth.sign(hash, web3.utils.toChecksumAddress(accounts[0]));
            let groupCreated    = await groupInstance.createGroup(METADATA_HASH, sig, nonce);

            const logGroupCreated = groupCreated.logs[0];

            assert.equal(
                logGroupCreated.event, 
                "GroupCreated", 
                "createGroup() call did not log 1 event"
            );

            assert.equal(
                logGroupCreated.args.groupId, 
                0, 
                "createGroup() sequence does not match 0"
            );

            assert.equal(
                logGroupCreated.args.groupOwner, 
                accounts[0], 
                "signer doesn't match event's groupOwner"
            );

        });

        it('should emit a MemberAdded event after group creation', async () => {
            let nonce           = 0;
            let hash            = await groupInstance.prepareCreateGroup(METADATA_HASH, nonce);
            let sig             = await web3.eth.sign(hash, web3.utils.toChecksumAddress(accounts[0]));
            let groupCreated    = await groupInstance.createGroup(METADATA_HASH, sig, nonce);

            const logGroupCreated = groupCreated.logs[1];

            assert.equal(
                logGroupCreated.event, 
                "MemberAdded", 
                "createGroup() call did not log MemberAdded  event"
            );

            assert.equal(
                logGroupCreated.args.groupId, 
                0, 
                "createGroup() sequence does not match 0"
            );

            assert.equal(
                logGroupCreated.args.role, 
                1, 
                "member added role is not 1 (the default role)"
            );

        });

        ///////////////////////////////////
        //
        // invitation testing
        //

        it('should prepare an invitation', async () => {
            let groupId         = 0;
            let role            = 1;
            let secret          = web3.utils.toHex('1337');
            let secretHash      = web3.utils.sha3(secret);
            let nonce           = await groupInstance.nonces.call(accounts[0]);

            let inviteCreated   = await groupInstance.prepareInvitation(
                groupId,
                role,
                secretHash,
                nonce
            );
        })

        it('should emit an InvitationPending event on successful invite storage', async () => {
            let groupId         = 0;
            let role            = 1;
            let secret          = web3.utils.toHex('1337');
            let secretHash      = web3.utils.sha3(secret);
            let nonce           = await groupInstance.nonces.call(accounts[0]);

            let inviteHash      = await groupInstance.prepareInvitation(
                groupId,
                role,
                secretHash,
                nonce
            );

            let sig             = await web3.eth.sign(inviteHash, web3.utils.toChecksumAddress(accounts[0]));
            let inviteStored    = await groupInstance.storeInvitation(
                groupId,
                role,
                secretHash,
                sig,
                nonce
            );

            const logInvStored  = inviteStored.logs[0];

            assert.equal(
                logInvStored.event, 
                "InvitationPending", 
                "storeInvitation() call did not log 1 event"
            );

            assert.equal(
                logInvStored.args.groupId, 
                0, 
                "storeInvitation() sequence does not match 0"
            );

            assert.equal(
                logInvStored.args.groupId, 
                0, 
                "groupId is incorrect"
            );

        });

        it('should add new member upon receipt of acceptInvitationCommit', async () => {
            let test1 = 0;
            let test2 = 1;

            assert.equal(test1, test2);
        })

    });

    async function sign(pk, message) {
        var msgHash = EthUtil.hashPersonalMessage(new Buffer(message));
        var signature = EthUtil.ecsign(msgHash, new Buffer(pk, 'hex'));
        var signatureRPC = EthUtil.toRpcSig(signature.v, signature.r, signature.s);

        return signatureRPC;
    };

})();
