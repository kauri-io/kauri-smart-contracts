'use strict';
(async (accounts) => { // 'accounts' included so maybe it'll retrieve accounts[n]

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

    const groupId               = 0;
    const adminRole             = 1;
    const subordinateRole       = 2;
    // const secret                = await web3.utils.toHex('1337');
    const secret                = '0x1337';
    const secretHash            = await web3.utils.soliditySha3(secret);


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
            let newGroup        = await stageNewGroup(accounts[0]);
        });

        it('should retrieve the correct nonce', async () => {
            let nonce           = await getNonce(accounts[0]);

            assert.equal(
                nonce, 
                0
            );

            let newGroup        = await stageNewGroup(accounts[0]);
            let incrNonce       = await getNonce(accounts[0]);

            assert.equal(
                incrNonce,
                1
            );

        });

        it('should fail to create a group because of incorrect nonce', async () => {
            let incorrectNonce  = 1;
            let hash            = await groupInstance.prepareCreateGroup(
                METADATA_HASH, 
                incorrectNonce
            );
            let sig             = await web3.eth.sign(
                hash, 
                web3.utils.toChecksumAddress(accounts[0])
            );

            await catchRevert(
                groupInstance.createGroup(
                    METADATA_HASH, 
                    sig, 
                    incorrectNonce)
            );
        });

        it('should emit a GroupCreated event after group creation', async () => {
            let groupCreated        = await stageNewGroup(accounts[0]);

            let logGroupCreated     = groupCreated.logs[0];

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
            let groupCreated        = await stageNewGroup(accounts[0]);

            let logGroupCreated     = groupCreated.logs[1];

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

        /*
         *  Invitation Testing
         */ 

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

        // update this to use the reusable functions
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

            let logInvStored  = inviteStored.logs[0];

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

        // update this to use reusable functions
        it('should store an invitation with correct recovered address', async () => {
            let nonce       = await groupInstance.nonces.call(accounts[0]);
            let msgHash     = await groupInstance.prepareInvitation(
                groupId,
                subordinateRole,
                secretHash,
                nonce
            );

            let sig         = await web3.eth.sign(
                msgHash, web3.utils.toChecksumAddress(accounts[0])
            );

            let storedInv = await groupInstance.storeInvitation(
                groupId,
                subordinateRole,
                secretHash,
                sig,
                nonce
            );

            let prefix = new Buffer("\x19Ethereum Signed Message:\n32");
            let res = EthUtil.fromRpcSig(sig);
            let msgBuf = EthUtil.toBuffer(msgHash);
            let prefixedMsgBuf = EthUtil.sha3(Buffer.concat([prefix, msgBuf]));
            let pub = EthUtil.ecrecover(prefixedMsgBuf, res.v, res.r, res.s);
            let addrBuf = EthUtil.publicToAddress(pub);
            let addr    = EthUtil.bufferToHex(addrBuf);

            assert.equal(EthUtil.toChecksumAddress(accounts[0]), EthUtil.toChecksumAddress(addr));
                
        });

        // testing that we need to include in the test suite
        // 1) test that when an incorrect hash is provided to the 'createGroup()'
        //      method that the test fails (here we will use assertRevert()')
        //      assertRevert = see the imported libraries at top of file
        //      

        it('should store an invitation', async () => {
            let nonce       = await groupInstance.nonces.call(accounts[0]);
            let msgHash     = await groupInstance.prepareInvitation(
                groupId,
                subordinateRole,
                secretHash,
                nonce
            );

            let sig         = await web3.eth.sign(
                msgHash, web3.utils.toChecksumAddress(accounts[0])
            );

            let storedInv = await groupInstance.storeInvitation(
                groupId,
                subordinateRole,
                secretHash,
                sig,
                nonce
            );
                
        });

        it('should fail to store an invitation when provided incorrect nonce', async () => {
            let nonce       = await getNonce(accounts[0]);
            
//            await stagePrepInvitation(
//                groupId,
//                subordinateRole,
//                await getKeccak(secret),
//                123123
//            );

            await catchRevert(
                await stagePrepInvitation(
                    groupId,
                    subordinateRole,
                    await groupInstance.getKeccak(secret),
                    123123
                )
            )
            
            // async function stagePrepInvitation(groupId, role, secretHash, nonce) {

        });

        it('should add another member as an admin of the group', async () => {
            // stage new group, accounts[0] is admin
            await stagePrepInvAndAccept(
                groupId,
                subordinateRole,
                getNonce(accounts[3]),
                accounts[3]
            );

        });

        it('should fail to add another member if not admin of group', async () => {
            // stage new group, accounts[0] is admin
            let newGroup =          await stageNewGroup(accounts[0]);

            let prepStageandStore   = await stagePrepAndStoreInv(
                accounts[1],    // admin account
                accounts[2]     // subordinate account
            );
            
        });

        it('should accept a stored invitation', async () => {
            let addGroup            = stageNewGroup(accounts[3]);

            let prepInvAndAccept    = await stagePrepInvAndAccept(
                groupId,
                subordinateRole,
                getNonce(accounts[3]),
                accounts[3],
            );

        });

//        it('should emit an event when invitation is stored', async () => {
//            let prepStageandStore   = await stagePrepAndStoreInv(
//                accounts[0],    // admin account
//                accounts[1]     // subordinate account
//            );
//
//            let logInvStored  = inviteStored.logs[0];
//
//            let log
//            
//        })

        it('should successfully revoke invitation when admin requests it', async () => {
            // stage new group
            await stageNewGroup(
                accounts[0]
            );

            let prepStageAndStore   = await stagePrepAndStoreInv(
                accounts[0] 
            );
            
            let revoke              = await prepAndRevokeInvitation(
                accounts[0]
            );

        });

        async function getNonce(addr) {
            let nonce = await groupInstance.getNonce(addr);
            return nonce;
        }

        async function prepAndRevokeInvitation(addr) {
            let secretHash      = await groupInstance.getKeccak(secret);

            let prepRevoke      = await groupInstance.prepareRevokeInvitation(
                groupId,
                secretHash,
                await groupInstance.getNonce(addr)
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

        }

        async function stageNewGroup(adminAddr) {
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
                METADATA_HASH, 
                sig, 
                nonce
            );

            return newGroup;
        };

        async function stagePrepInvitation(groupId, role, secretHash, nonce) {
            let msgHash = await groupInstance.prepareInvitation(
                groupId,
                role,
                secretHash,
                nonce
            );

            return msgHash;
        };

        async function stagePrepAndStoreInv(addr) {
            let nonce           = await getNonce(addr);
            let secretHash      = await groupInstance.getKeccak(secret);
            let msgHash         = await groupInstance.prepareInvitation(
                groupId,
                subordinateRole,
                secretHash,
                nonce
            );

            let sig             = await web3.eth.sign(
                secretHash,
                web3.utils.toChecksumAddress(addr)
            );

            let InvStored       = await groupInstance.storeInvitation(
                groupId,
                subordinateRole,
                secretHash,
                sig,
                nonce
            );
            console.log(nonce);

            return msgHash;
        };

        async function stagePrepInvAndAccept(groupId, role, nonce, addr) {
            const secretHash            = await groupInstance.getKeccak(secret);
            let msgHash = await groupInstance.prepareInvitation(
                groupId,
                role,
                web3.utils.sha3('0x1337'),
                await getNonce(addr)
            );

            let sig             = await web3.eth.sign(
                msgHash,
                web3.utils.toChecksumAddress(addr)
            );

            let storedInv       = await groupInstance.storeInvitation(
                groupId,
                role,
                secretHash,
                sig,
                await getNonce(addr)
            );

            let addrSecretHash  = await EthUtil.keccak256(
                secret, 
                addr
            );

            let prepHash        = await groupInstance.prepareAcceptInvitationCommit(
                groupId,
                addrSecretHash,
                0 //await getNonce(addr)
            );

            let prepSig         = await web3.eth.sign(
                prepHash,
                web3.utils.toChecksumAddress(addr)
            );

            let acceptInvCommit = await groupInstance.acceptInvitationCommit(
                groupId,
                addrSecretHash,
                prepSig,
                0 //await getNonce(addr)
            );

            let acceptInv       = await groupInstance.acceptInvitation(
                groupId,
                secret,
                addr
            );

        };

    });

    async function sign(pk, message) {
        var msgHash = EthUtil.hashPersonalMessage(new Buffer(message));
        var signature = EthUtil.ecsign(msgHash, new Buffer(pk, 'hex'));
        var signatureRPC = EthUtil.toRpcSig(signature.v, signature.r, signature.s);

        return signatureRPC;
    };

})();
