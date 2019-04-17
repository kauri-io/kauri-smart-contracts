// TODO: COMMON interface updating and testing

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
    const secret                = '0x1337';

    contract('Group', async accounts => {

        beforeEach(async () => {
            storageInstance     = await Storage.new();
            groupInstance       = await Group.new([2]);
            adminController     = await AdminController.new();

            // fix the below to produce correct keccak256 hash
            // i.e. remove 'getKeccak()' function from contract
            const secretHash    = await groupInstance.getKeccak(secret);

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
                nonce,          // retrieve empty storage key/value, which is 0
                0               //
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
            await stageNewGroup(accounts[0]);
            let groupId         = 0;
            let role            = 1;
            let secret          = web3.utils.toHex('1337');
            let secretHash      = web3.utils.sha3(secret);
            let nonce           = await groupInstance.getNonce.call(accounts[0]);

            let inviteCreated   = await groupInstance.prepareInvitation(
                groupId,
                role,
                secretHash,
                nonce
            );
        })

        // update this to use the reusable functions
        it('should emit an InvitationPending event on successful invite storage', async () => {
            let inviteStored            = await stageNewGroup(accounts[0]);

            let prepInv                 = await stagePrepAndStoreInv(accounts[1]);
            let logInvStored            = prepInv.logs[0];

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
            await stageNewGroup(accounts[0]);
            let secretHash  = await groupInstance.getKeccak(secret);
            let nonce       = await groupInstance.getNonce.call(accounts[1]);
            let msgHash     = await groupInstance.prepareInvitation(
                groupId,
                subordinateRole,
                secretHash,
                nonce
            );

            let sig         = await web3.eth.sign(
                msgHash, web3.utils.toChecksumAddress(accounts[1])
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

            assert.equal(EthUtil.toChecksumAddress(accounts[1]), EthUtil.toChecksumAddress(addr));

        });

        it('should store an invitation', async () => {
            await stageNewGroup(accounts[0]);
            let invStored           = await stagePrepAndStoreInv(accounts[1]);
        });


        it('should fail to store an invitation when provided incorrect nonce', async () => {
          let incorrectNonce = 12423;
          let  secretHash    = await groupInstance.getKeccak(secret);
          let msgHash     = await stagePrepInvitation(
              groupId,
              subordinateRole,
              secretHash,
              incorrectNonce
          );

          let sig         = await web3.eth.sign(
              msgHash, web3.utils.toChecksumAddress(accounts[0])
          );

          await catchRevert (
              groupInstance.storeInvitation(
                groupId,
                subordinateRole,
                secretHash,
                sig,
                incorrectNonce
              )
            );

          });

        it('should add another member as an admin of the group', async () => {
            // stage new group, accounts[0] is admin
            await stageNewGroup(accounts[0]);
            // stage prepareInvite(), storeInvitation(), and acceptInvitation()
            await stagePrepInvAndAccept(
                groupId,
                subordinateRole,
                getNonce(accounts[1]),
                accounts[1]
            );

            let memberRole = await groupInstance.getRole.call(
                groupId,
                accounts[1]
            );

            assert.equal(
                memberRole,
                2               // role 2 (not admin)
            );
        });

        it('should add another admin as an admin of the group', async () => {
            // stage new group, accounts[0] is admin
            await stageNewGroup(accounts[0]);
            // stage prepareInvite(), storeInvitation(), and acceptInvitation()
            await stagePrepInvAndAccept(
                groupId,
                subordinateRole,
                getNonce(accounts[3]),
                accounts[3]
            );

            let memRole     = await groupInstance.isAdmin(
                groupId,
                accounts[3]
            );

            assert.equal(
                memRole,
                false
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

        // it('should not allow an admin to add a zero address as an admin', async() => {
        // let newMemberAddress = 0;
        // let role = 1;
        // let nonce       = await groupInstance.nonces.call(accounts[0]);
        //
        // // let addNewMember = await groupInstance.addMember(
        // //   groupId,
        // //   newMemberAddress,
        // //   nonce
        // // )
        //
        // await catchRevert(groupInstance.prepareChangeMemberRole(
        //   groupId,
        //   newMemberAddress,
        //   role,
        //   nonce
        // ))

      // });


        it('should store an invitation in pending state', async () => {
            let addGroup            = stageNewGroup(accounts[3]);

            const secretHash    = await groupInstance.getKeccak(secret);

            let prepInvAndAccept    = await stagePrepAndStoreInv(
                accounts[3]
            );

            let invState            = await groupInstance.getInvitationState.call(
                groupId,
                secretHash
            );

            assert.equal(
                invState,
                0                   // enum 0 == Invitation.Pending
            );

        });

        it('should successfully revoke invitation when admin requests it', async () => {
            // stage new group
            await stageNewGroup(
                accounts[0]
            );

            const secretHash    = await groupInstance.getKeccak(secret);

            let prepStageAndStore   = await stagePrepAndStoreInv(
                accounts[1]
            );

            let revoke              = await prepAndRevokeInvitation(
                accounts[0]
            );

            let invState            = await groupInstance.getInvitationState.call(
                groupId,
                secretHash
            );

            assert.equal(
                invState,
                1                   // enum 1 == Invitation.Revoked
            )

        });

        // it('should emit an InvitationRevoked event when an invitation is revoked', async () => {
          // let nonce           = await getNonce(accounts[0]);
          // let secretHash    = await groupInstance.getKeccak(secret);
          // let inviteRevoked = await groupInstance.prepareRevokeInvitation(
          //                                     groupId,
          //                                     secretHash,
          //                                     nonce
          //                                   );
          //
          // let logInviteRevoke           = inviteRevoked.logs[0];

          // assert.equal(
          //   logInviteRevoke.event,
          //   "revokeInvitation",
          //   "invitation was not revoked"
          // );

        // };
        //
        // it('should emit an MemberRemoved event when an invitation is revoked', async () => {
        //     // todo
        //     // code from other event logging tests can be reused here
        //     // same code
        // };
        //
        // it('should emit an InvitationRevoked event when an invitation is revoked', async () => {
        //     // todo
        // };
        //
        // it('should change an existing member at admin request', async () => {
        //     await stageNewGroup(
        //         accounts[0]
        //     );
        //
        //     const secretHash    = await groupInstance.getKeccak(secret);
        //
        //     let invAccepted     = stagePrepInvAndAccept(
        //         groupId,
        //         subordinateRole,
        //         await getNonce(accounts[1]),
        //         accounts[1]
        //     );
        //
        //     let currentRole      = await groupInstance.getRole.call(groupId, accounts[1]);
        //
        //     assert.equal(
        //         currentRole,
        //         2// normal member
        //     );
        //
        //     let newRoleHash     = await groupInstance.prepareChangeMemberRole(
        //         groupId,
        //         accounts[1],
        //         adminRole,
        //         await getNonce(accounts[1])
        //     );
        //
        //     let changeRole      = await groupInstance.changeMemberRole(
        //         groupId,
        //         accounts[1],
        //         adminRole,
        //         await getNonce(accounts[1])
        //     );
        //
        //     let newRole         = await groupInstance.getRole.call(groupId, accounts[1]);
        //
        //     assert.equal(
        //         newRole,
        //         1   // admin
        //     );
        //
        // })

        async function getNonce(addr) {
            let nonce = await groupInstance.getNonce.call(addr);
            return nonce;
        }

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

            let invStored       = await groupInstance.storeInvitation(
                groupId,
                subordinateRole,
                secretHash,
                sig,
                nonce
            );

            return invStored;
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
