'use strict';
(async () => { 

    const Group                 = artifacts.require("GroupConnector.sol");
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

    // static groupId & roles
    const groupId               = 0;
    const adminRole             = 1;
    const memberRole            = 2;

    // secret hashes
    const secretOne             = await EthUtil.keccak256('1337');
    const secretTwo             = await EthUtil.keccak256('1338');
    const secretThree           = await EthUtil.keccak256('1339');

    // empty arrays
    const emptyHashArray        = [];
    const emptyRolesArray       = [];

    contract('Group', async accounts => {

        beforeEach(async () => {
            storageInstance     = await Storage.new();
            groupInstance       = await Group.new();
            adminController     = await AdminController.new();

            await storageInstance.setAdminController(adminController.address);
            await groupInstance.setAdminController(adminController.address);
            await groupInstance.setStorageContractAddress(storageInstance.address);
            await storageInstance.addWritePermission(groupInstance.address);

            // add additional role '2' (member/moderator)
            await groupInstance.addRoles([2]);

        });

        it('should create a group without additional invitations', async () => {
            let emptyHashArray    = [];
            let emptyRolesArray = [];

            let newGroup        = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );
        });

        it('should create a group with 3 additional arrays', async() => {
            let secHashOne      = await genSecretHash(secretOne);
            let secHashTwo      = await genSecretHash(secretTwo);
            let secHashThree    = await genSecretHash(secretThree);

            let secretHashArray = [secHashOne, secHashTwo, secHashThree];
            let rolesArray      = [2, 2, 2];

            let newGroup        = await stageNewGroup(
                accounts[0],
                secretHashArray,
                rolesArray
            );
        });

        it('should fail to create a group when sending 11 invitation arrays', async() => {
            let secHashOne      = await genSecretHash(secretOne);
            let secHashTwo      = await genSecretHash(secretTwo);
            let secHashThree    = await genSecretHash(secretThree);
            let secHashFour     = await genSecretHash('1340');
            let secHashFive     = await genSecretHash('1341');
            let secHashSix      = await genSecretHash('1342');
            let secHashSeven    = await genSecretHash('1343');
            let secHashEight    = await genSecretHash('1344');
            let secHashNine     = await genSecretHash('1345');
            let secHashTen      = await genSecretHash('1346');
            let secHashEleven   = await genSecretHash('1347');

            let secretHashArray = [secHashOne,secHashTwo,secHashThree,secHashFour,
                                  secHashFive,secHashSix,secHashSeven,secHashEight,secHashNine,
                                  secHashTen, secHashEleven];

            let rolesArray      = [2,2,2,2,2,2,2,2,2,2,2];

            await catchRevert(
                groupInstance.createGroup(
                    METADATA_HASH, 
                    secretHashArray, 
                    rolesArray
                )
            );

        });

        it('should create a group as a direct-tx with no additional invitations', async() => {
            // send tx to createGroup
            let secretHashArray = [];
            let rolesArray      = [];

            let newGroup        = await groupInstance.createGroup(METADATA_HASH, secretHashArray, rolesArray);
        });

        it('should retrieve the correct nonce', async () => {
            let nonce           = await getNonce(accounts[0]);

            assert.equal(
                nonce,          // retrieve empty storage key/value, which is 0
                0
            );

            let newGroup        = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

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
                emptyHashArray,
                emptyRolesArray,
                incorrectNonce
            );

            let sig             = await web3.eth.sign(
                hash,
                web3.utils.toChecksumAddress(accounts[0])
            );

            await catchRevert(
                groupInstance.createGroup(
                    METADATA_HASH,
                    emptyHashArray,
                    emptyRolesArray,
                    sig,
                    incorrectNonce
                )
            );
        });

        it('should emit a GroupCreated event after group creation', async () => {
            let groupCreated        = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

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
            let groupCreated        = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

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
            let groupCreated        = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

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
        });

        // update this to use the reusable functions
        it('should emit an InvitationPending event on successful invite storage', async () => {
            let inviteStored            = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let prepInv                 = await stagePrepAndStoreInv(
                accounts[1]
            ); 

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
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let secretHash  = await genSecretHash(secretOne);
            let nonce       = await groupInstance.getNonce.call(accounts[1]);
            let msgHash     = await groupInstance.prepareInvitation(
                groupId,
                memberRole,
                secretHash,
                nonce
            );

            let sig         = await web3.eth.sign(
                msgHash, web3.utils.toChecksumAddress(accounts[1])
            );

            let storedInv = await groupInstance.storeInvitation(
                groupId,
                memberRole,
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
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let invStored           = await stagePrepAndStoreInv(accounts[1]);
        });

        it('should store an invitation as a direct-tx', async () => {
            let secretHashArray = [];
            let rolesArray = [];
            let newGroup = await groupInstance.createGroup(METADATA_HASH, secretHashArray, rolesArray);
            let secretHash =  await genSecretHash(secretOne);

            await groupInstance.storeInvitation(groupId, memberRole, secretHash);
        });

        it('should revoke an invitation as a direct-tx', async () => {
          let secretHashArray = [];
          let rolesArray = [];
          let newGroup = await groupInstance.createGroup(METADATA_HASH, secretHashArray, rolesArray);
          let secretHash = await genSecretHash(secretOne);

          await groupInstance.storeInvitation(groupId, memberRole, secretHash);
          await groupInstance.revokeInvitation(groupId,secretHash);
        });

        it('should accept an invitation as a direct-tx', async () => {
          let secretHashArray = [];
          let rolesArray = [];
          let newGroup = await groupInstance.createGroup(METADATA_HASH,secretHashArray, rolesArray);

          let addressSecretHash = await web3.utils.soliditySha3(accounts[1], secretOne);

          await groupInstance.acceptInvitationCommit(groupId,addressSecretHash);

        });

        it('should remove a member as a direct-tx', async () => {
         let secretHashArray = [];
         let rolesArray = [];
         let newGroup = await groupInstance.createGroup(METADATA_HASH, secretHashArray, rolesArray);

         let secretHash = await genSecretHash(secretOne);

         await groupInstance.storeInvitation(groupId,memberRole, secretHash);

         await groupInstance.removeMember(groupId,accounts[1]);
        });

        it('should remove a member as a meta-tx', async () => {
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            await stagePrepInvAndAccept(
                groupId,
                memberRole,
                accounts[1]
            );

            //let prepInv = await groupInstance.prepareInvitation(
            //    groupId,
            //    memberRole,
            //    emptyHashArray,
            //    0
            //);

            //let storeInv  = await groupInstance.storeInvitation(
            //    groupId,
            //    memberRole,
            //    emptyHashArray,
            //    prepInv,
            //    0
            //);

            //let prepRemove  = await groupInstance.prepareRemoveMember(
            //    groupId,
            //    accounts[1],
            //    0
            //);

            //let removeMem   = await groupInstance.removeMember(
            //    groupId,
            //    accounts[1],
            //    prepRemove,
            //    0
            //);

        });


        it('should change member role as a direct-tx', async () => {
          let secretHashArray = [];
          let rolesArray = [];
          let newGroup = await groupInstance.createGroup(METADATA_HASH,secretHashArray,rolesArray);

          let secretHash = await genSecretHash(secretOne);

          await groupInstance.storeInvitation(groupId, memberRole, secretHash);

          await groupInstance.changeMemberRole(groupId,accounts[1],adminRole);
        });


        it('should fail to store an invitation when provided incorrect nonce', async () => {
          let incorrectNonce = 1;
          let secretHash    = await genSecretHash(secretOne);
          let msgHash       = await stagePrepInvitation(
              groupId,
              memberRole,
              secretHash,
              incorrectNonce
          );

          let sig           = await web3.eth.sign(
              msgHash, web3.utils.toChecksumAddress(accounts[0])
          );

          await catchRevert(
              groupInstance.storeInvitation(
                groupId,
                memberRole,
                secretHash,
                sig,
                incorrectNonce
              )
            );

          });

        it('should add another member (change) as an admin of the group', async () => {
            // stage new group, accounts[0] is admin
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            await stagePrepInvAndAccept(
                groupId,
                memberRole,
                accounts[1]
            );

            await changeMemberRole(
                accounts[0],
                accounts[1],
                adminRole
            );

            let newMemberRole   = await getRole(
                groupId,
                accounts[0]
            );

            await assert.equal(
                newMemberRole,
                1               // role 1 == admin
            );
        });


        // //forever pending
        // it('should successfully change a member as an admin', async() => {
        //   await stageNewGroup(accounts[0]);
        //
        //   await stagePrepInvAndAccept(
        //     groupId,
        //     subordinateRole,
        //     getNonce(accounts[0]),
        //     accounts[1]
        //   );
        //
        //   let prep = await prepareChangeMemberRole(
        //     groupId,
        //     accounts[1],
        //     adminRole,
        //     await getNonce(accounts[0])
        //   );
        //
        //   let sig = await web3.eth.sign(prep, web3.utils.toChecksumAddress(accounts[0]));
        //
        //   await changeMemberRole(
        //     groupId,
        //     accounts[1],
        //     adminRole,
        //     sig,
        //     await getNonce(accounts[0])
        //   );
        //
        // });

        // //forever pending
        // it('should fail to change a member as a non-admin', async() => {
        //   await stageNewGroup(accounts[0]);
        //
        //   await stagePrepInvAndAccept(
        //     groupId,
        //     subordinateRole,
        //     getNonce(accounts[1]),
        //     accounts[1]
        //   );
        //
        //   let prep = await prepareChangeMemberRole(
        //     groupId,
        //     accounts[1],
        //     subordinateRole,
        //     await getNonce(accounts[1])
        //   );
        //
        //   await changeMemberRole(
        //     groupId,
        //     accounts[1],
        //     adminRole,
        //     prep,
        //     await getNonce(accounts[1])
        //   );
        //
        // });

        // it('should fail to change a member as an admin when provided incorrect nonce', async() => {
        //   await stageNewGroup(accounts[0], emptyHashArray, emptyRolesArray);
        //
        //   let prep = await prepareChangeMemberRole(
        //     groupId,
        //     accounts[2],
        //     adminRole,
        //     await getNonce(accounts[0]);
        //
        //
        //   catchRevert(await changeMemberRole(
        //     groupId,
        //     accounts[2],
        //     adminRole,
        //     prep,
        //     2)
        //   );
        //
        // });

        it('should fail to add another member if not admin of group', async () => {
            // stage new group, accounts[0] is admin
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );


            let prepStageandStore   = await stagePrepAndStoreInv(
                accounts[1],    // admin account
                accounts[2]     // subordinate account
            );

        });


        it('should store an invitation in pending state', async () => {
            let newGroup            = stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let prepInvAndAccept    = await stagePrepAndStoreInv(
                accounts[1]
            );

            let secretHash          = await genSecretHash(secretOne);

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
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let secretHash    = await genSecretHash(secretOne);

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

        async function getNonce(addr) {
            let nonce = await groupInstance.getNonce.call(addr);
            return nonce;
        }

        async function prepAndRevokeInvitation(addr) {
            let secretHash      = await genSecretHash(secretOne);

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

        //////////////////////////////////////////////////
        // STAGE_NEW_GROUP
        //////////////////////////////////////////////////

        async function stageNewGroup(adminAddr, secretHashArray, rolesArray) {
            let nonce           = await getNonce(adminAddr);
            let msgHash         = await groupInstance.prepareCreateGroup(
                METADATA_HASH,
                secretHashArray,
                rolesArray,
                nonce
            );

            let sig             = await web3.eth.sign(
                msgHash,
                web3.utils.toChecksumAddress(adminAddr)
            );

            let newGroup        = await groupInstance.createGroup(
                METADATA_HASH,
                secretHashArray,
                rolesArray,
                sig,
                nonce
            );

            return newGroup;
        };

        //////////////////////////////////////////////////
        // STAGE_PREP_INVITATION
        //////////////////////////////////////////////////

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
            let prepNonce       = await getNonce(addr);
            let secretHash      = await genSecretHash(secretOne);
            let msgHash         = await groupInstance.prepareInvitation(
                groupId,
                memberRole,
                secretHash,
                prepNonce
            );
            
            let sig             = await web3.eth.sign(
                secretHash,
                web3.utils.toChecksumAddress(addr)
            );

            let storeNonce      = await getNonce(addr);
            let invStored       = await groupInstance.storeInvitation(
                groupId,
                memberRole,
                secretHash,
                sig,
                storeNonce
            );

            return invStored;
        };

        async function stagePrepInvAndAccept(groupId, role, addr) {
            let secretHash      = await genSecretHash(secretOne);
            let prepInvNonce    = await getNonce(addr);
            let msgHash         = await groupInstance.prepareInvitation(
                groupId,
                role,
                secretHash,
                prepInvNonce
            );

            let sig             = await web3.eth.sign(
                msgHash,
                web3.utils.toChecksumAddress(addr)
            );

            let storeInvNonce   = await getNonce(addr);
            let storedInv       = await groupInstance.storeInvitation(
                groupId,
                role,
                secretHash,
                sig,
                storeInvNonce
            );

            let addrSecretHash  = await EthUtil.keccak256(
                secretOne,
                web3.utils.toChecksumAddress(addr)
            );

            let prepAccInvNonce = await getNonce(addr);
            let prepHash        = await groupInstance.prepareAcceptInvitationCommit(
                groupId,
                addrSecretHash,
                prepAccInvNonce 
            );

            let prepSig         = await web3.eth.sign(
                prepHash,
                web3.utils.toChecksumAddress(addr)
            );

            let accInvNonce     = await getNonce(addr);
            let acceptInvCommit = await groupInstance.acceptInvitationCommit(
                groupId,
                addrSecretHash,
                prepSig,
                accInvNonce
            );

            let acceptInv       = await groupInstance.acceptInvitation(
                groupId,
                secretOne,
                addr
            );

        };

        //////////////////////////////////////////////////
        // CHANGE_MEMBER
        //////////////////////////////////////////////////

        async function changeMemberRole(adminAddr, accountToChange, newRole) {
            let prepNonce       = await getNonce(adminAddr);
            let prepChangeRole  = await groupInstance.prepareChangeMemberRole(
                groupId,
                accountToChange,
                newRole,
                prepNonce
            );

            let sig             = await web3.eth.sign(
                prepChangeRole,
                web3.utils.toChecksumAddress(adminAddr)
            );

            let changeNonce     = await getNonce(adminAddr);
            let performChange   = await groupInstance.changeMemberRole(
                groupId,
                accountToChange,
                newRole,
                sig,
                changeNonce
            );
        };

        //////////////////////////////////////////////////
        // GENERATE_SECRET_HASH
        //////////////////////////////////////////////////

        async function genSecretHash(secretToHash) {
            let bufferedHash    = EthUtil.keccak256(secretToHash);
            let hexedHash       = EthUtil.bufferToHex(bufferedHash);

            return hexedHash;
        };

        //////////////////////////////////////////////////
        // GET_ROLE
        //////////////////////////////////////////////////

        async function getRole(groupId, addr) {
            let memberRole      = await groupInstance.getRole.call(
                groupId,
                addr
            );

            return memberRole;
        };


    });

})();
