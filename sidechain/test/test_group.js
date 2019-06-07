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
    const secret                = hash('1337');
    const secHash01             = hash(secret);
    const secHash02             = hash(hash('1338'));
    const secHash03             = hash(hash('1339'));
    const secHash04             = hash(hash('1340'));
    const secHash05             = hash(hash('1341'));
    const secHash06             = hash(hash('1342'));
    const secHash07             = hash(hash('1343'));
    const secHash08             = hash(hash('1344'));
    const secHash09             = hash(hash('1345'));
    const secHash10             = hash(hash('1346'));
    const secHash11             = hash(hash('1347'));

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
            let emptyHashArray  = [];
            let emptyRolesArray = [];

            let newGroup        = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );
        });

        it('should create a group with 3 additional arrays', async() => {
            let secretHashArray = [secHash01, secHash02, secHash03];
            let rolesArray      = [2, 2, 2];

            let newGroup        = await stageNewGroup(
                accounts[0],
                secretHashArray,
                rolesArray
            );
        });

        it('should create a group when sending 8 invitation arrays', async() => {
            let eightSecretHashArray = [secHash01, secHash02, secHash03, secHash04,
                                   secHash05, secHash06, secHash07, secHash08];

            let eightRolesArray      = [2,2,2,2,2,2,2,2];

            let groupCreated = await stageNewGroup(
                accounts[0],
                eightSecretHashArray,
                eightRolesArray
            )

            let logGroupCreated     = groupCreated.logs[0];
            let addMemberEvent      = groupCreated.logs[1];
            let firstInvite         = groupCreated.logs[2];

            let numEvents           = groupCreated.logs.length;

            // emit 10 events (1 GroupCreated, 1 MemberAdded, 8 InvitationPending events)
            assert.equal(
                numEvents,
                10,
                "10 events were not emitted"
            );

            assert.equal(
                logGroupCreated.event,
                "GroupCreated",
                "createGroup() call did not log 1 event"
            );

            assert.equal(
                addMemberEvent.event,
                "MemberAdded",
                "createGroup() call did not log 'MemberAdded' event"
            );

            assert.equal(
                firstInvite.event,
                "InvitationPending",
                "createGroup() call did not log 'InvitationPending' event"
            );

        });

        it('should create a group when sending 9 invitation arrays', async() => {

            let nineSecretHashArray = [secHash01,  secHash02, secHash03, secHash04,
                                  secHash05, secHash06, secHash07, secHash08, secHash09];

            let nineRolesArray      = [2,2,2,2,2,2,2,2,2];

            let groupCreated = await stageNewGroup(
                accounts[0],
                nineSecretHashArray,
                nineRolesArray
            )

            let groupCreatedEvent   = groupCreated.logs[0];
            let addMemberEvent      = groupCreated.logs[1];
            let firstInviteEvent    = groupCreated.logs[2];

            let numberOfEvents           = groupCreated.logs.length;

            // should emit 11 events (1 GroupCreated, 1 MemberAdded, 9 InvitationPending events)
            assert.equal(
                numberOfEvents,
                11,
                "11 events were not emitted"
            );

            assert.equal(
                groupCreatedEvent.event,
                "GroupCreated",
                "createGroup() call did not log 1 event"
            );

            assert.equal(
                addMemberEvent.event,
                "MemberAdded",
                "createGroup() call did not log 'MemberAdded' event"
            );

            assert.equal(
                firstInviteEvent.event,
                "InvitationPending",
                "createGroup() call did not log 'InvitationPending' event"
            );

        });

        it('should create a group when sending 10 invitation arrays', async() => {
            let tenSecretHashArray = [secHash01, secHash02, secHash03, secHash04,
                                   secHash05, secHash06, secHash07, secHash08, secHash09, secHash10];

            let tenRolesArray      = [2,2,2,2,2,2,2,2,2,2];

            let groupCreated = await stageNewGroup(
                accounts[0],
                tenSecretHashArray,
                tenRolesArray
            );

            let groupCreatedEvent   = groupCreated.logs[0];
            let addMemberEvent      = groupCreated.logs[1];
            let firstInviteEvent    = groupCreated.logs[2];

            let numberOfEvents       = groupCreated.logs.length;

            assert.equal(
                numberOfEvents,
                12,
                "12 events were not emitted"
            );

            assert.equal(
                groupCreatedEvent.event,
                "GroupCreated",
                "createGroup() call did not log 1 event"
            );

            assert.equal(
                addMemberEvent.event,
                "MemberAdded",
                "createGroup() call did not log 'MemberAdded' event"
            );

            assert.equal(
                firstInviteEvent.event,
                "InvitationPending",
                "createGroup() call did not log 'InvitationPending' event"
            );

        });

        it('should fail to create a group when sending 11 invitation arrays', async() => {
            let secretHashArray = [secHash01,secHash02,secHash03,secHash04,
                                  secHash05,secHash06,secHash07,secHash08,secHash09,
                                  secHash10, secHash11];

            let rolesArray      = [2,2,2,2,2,2,2,2,2,2,2];

            await catchRevert(
                groupInstance.createGroup(
                    METADATA_HASH,
                    secretHashArray,
                    rolesArray
                )
            );

        });

        it('should store a batch of invitations', async() => {
            let batchArray      = [secHash01, secHash02, secHash03, secHash04, secHash05, 
                secHash06, secHash07, secHash08, secHash09, secHash10];
            let rolesArray      = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
            
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let batchHash       = await groupInstance.prepareBatchInvitation(
                groupId,
                batchArray,
                rolesArray,
                await getNonce(accounts[0])
            );

            let sig             = await web3.eth.sign(
                batchHash,
                web3.utils.toChecksumAddress(accounts[0])
            );

            let batchInvite     = await groupInstance.storeBatchInvitation(
                groupId,
                batchArray,
                rolesArray,
                sig,
                await getNonce(accounts[0])
            );
        })

        it('should fail to store a batch of invitations greater than 10', async() => {
            let batchArray      = [secHash01, secHash02, secHash03, secHash04, secHash05, 
                secHash06, secHash07, secHash08, secHash09, secHash10, secHash11];
            let rolesArray      = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
            
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let batchHash       = await groupInstance.prepareBatchInvitation(
                groupId,
                batchArray,
                rolesArray,
                await getNonce(accounts[0])
            );

            let sig             = await web3.eth.sign(
                batchHash,
                web3.utils.toChecksumAddress(accounts[0])
            );

            await catchRevert(groupInstance.storeBatchInvitation(
                groupId,
                batchArray,
                rolesArray,
                sig,
                await getNonce(accounts[0])
            ));

        })

        it('should create a group as a direct-tx with no additional invitations', async() => {
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
            let nonce           = await groupInstance.getNonce.call(accounts[0]);

            let inviteCreated   = await groupInstance.prepareInvitation(
                groupId,
                role,
                secHash01,
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
                accounts[0]
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
                "storeInvitation() groupId does not match 0"
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

            let nonce       = await groupInstance.getNonce.call(accounts[0]);
            let msgHash     = await groupInstance.prepareInvitation(
                groupId,
                memberRole,
                secHash01,
                nonce
            );

            let sig         = await web3.eth.sign(
                msgHash, 
                web3.utils.toChecksumAddress(accounts[0])
            );

            let storedInv = await groupInstance.storeInvitation(
                groupId,
                memberRole,
                secHash01,
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

        it('should store an invitation', async () => {
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let invStored           = await stagePrepAndStoreInv(accounts[0]);
        });

        it('should store an invitation as a direct-tx', async () => {
            let secretHashArray = [];
            let rolesArray = [];
            let newGroup = await groupInstance.createGroup(METADATA_HASH, secretHashArray, rolesArray);

            await groupInstance.storeInvitation(groupId, memberRole, secHash01);
        });

        it('should revoke an invitation as a direct-tx', async () => {
            let secretHashArray = [];
            let rolesArray = [];
            let newGroup = await groupInstance.createGroup(METADATA_HASH, secretHashArray, rolesArray);

            await groupInstance.storeInvitation(groupId, memberRole, secHash01);
            await groupInstance.revokeInvitation(groupId, secHash01);
        });

        it('should accept an invitation as a direct-tx', async () => {
            let secretHashArray = [secHash01];
            let rolesArray = [2];

            let newGroup = await groupInstance.createGroup(
                METADATA_HASH, 
                secretHashArray, 
                rolesArray
            );

            let addressSecretHash = await web3.utils.soliditySha3(
                secret,
                accounts[1]
            );

            await groupInstance.acceptInvitationCommit(
                groupId, 
                addressSecretHash,
                { from: accounts[1] }
            );

            await groupInstance.acceptInvitation(
                groupId,
                secret,
                accounts[1]
            );
        });

        it('should not allow an incorrect user to steal a committed invitation as a direct-tx', async () => {
            let secretHashArray = [secHash01];
            let rolesArray = [2];

            let newGroup = await groupInstance.createGroup(
                METADATA_HASH, 
                secretHashArray, 
                rolesArray
            );

            let addressSecretHash = await web3.utils.soliditySha3(
                accounts[1], 
                '1337'
            );

            await groupInstance.acceptInvitationCommit(
                groupId, 
                addressSecretHash
            );

            //Note account doesn't match signed commit
            await catchRevert(groupInstance.acceptInvitation(
                groupId,
                await EthUtil.keccak256('1337'),
                accounts[2]
            ));
        });

        it('should remove a member as a direct-tx', async () => {
            await directAcceptInv(
                accounts[0], 
                accounts[1], 
                secHash01, 
                memberRole
            );
             
            await groupInstance.methods['removeMember(uint256,address)'](
                groupId, 
                accounts[1], 
                { from: accounts[0] }
            );

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
                accounts[0],
                accounts[1]
            );

            let remHash = await groupInstance.methods['prepareRemoveMember(uint256,address,uint256)'](
                groupId,
                accounts[1],
                await getNonce(accounts[0]),
                { from: accounts[0] }
            );

            let remSig = await web3.eth.sign(
                remHash,
                accounts[0]
            );

            await groupInstance.methods['removeMember(uint256,address,bytes,uint256)'](
                groupId,
                accounts[1],
                remSig,
                await getNonce(accounts[0]),
                { from: accounts[0] }
            );
        });

        it('should change member role as a direct-tx', async () => {
            let secretHashArray = [];
            let rolesArray = [];
            let newGroup = await groupInstance.createGroup(METADATA_HASH,secretHashArray,rolesArray);

            await stagePrepInvAndAccept(
                groupId,
                memberRole,
                accounts[0],
                accounts[1]
            );

            await groupInstance.changeMemberRole(groupId,accounts[1],adminRole);
        });


        it('should fail to store an invitation when provided incorrect nonce', async () => {
          let incorrectNonce = 1;
          let msgHash       = await stagePrepInvitation(
              groupId,
              memberRole,
              secHash01,
              incorrectNonce
          );

          let sig           = await web3.eth.sign(
              msgHash, web3.utils.toChecksumAddress(accounts[0])
          );

          await catchRevert(
              groupInstance.storeInvitation(
                groupId,
                memberRole,
                secHash01,
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
                accounts[0],
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


        it('should successfully change a member as an admin', async() => {
            await stageNewGroup(accounts[0], emptyHashArray, emptyRolesArray);

            await stagePrepInvAndAccept(
                groupId,
                memberRole,
                accounts[0],
                accounts[1]
            );

            await changeMemberRole(accounts[0], accounts[1], adminRole)

        });

        it('should fail to change a member as a non-admin', async() => {
            await stageNewGroup(accounts[0], emptyHashArray, emptyRolesArray);

            await stagePrepInvAndAccept(
                groupId,
                memberRole,
                accounts[0],
                accounts[1]
            );

            await catchRevert(
                changeMemberRole(accounts[1], accounts[1], adminRole)
            );

        });
        
        it('should be unable to orphan a group when removing member', async() => {
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            await stagePrepInvAndAccept(
                groupId,
                memberRole,
                accounts[0],
                accounts[1]
            );

            let remHash = await groupInstance.methods['prepareRemoveMember(uint256,address,uint256)'](
                groupId,
                accounts[0],
                await getNonce(accounts[0]),
                { from: accounts[0] }
            );

            let remSig = await web3.eth.sign(
                remHash,
                accounts[0]
            );

            await catchRevert(groupInstance.methods['removeMember(uint256,address,bytes,uint256)'](
                groupId,
                accounts[0],
                remSig,
                await getNonce(accounts[0]),
                { from: accounts[0] }
            ));
        })

        it('should be unable to orphan a group when changing member', async() => {
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            await stagePrepInvAndAccept(
                groupId,
                memberRole,
                accounts[0],
                accounts[1]
            );

            let chgHash = await groupInstance.methods['prepareChangeMemberRole(uint256,address,uint8,uint256)'](
                groupId,
                accounts[0],
                memberRole,
                await getNonce(accounts[0]),
                { from: accounts[0] }
            );

            let chgSig = await web3.eth.sign(
                chgHash,
                accounts[0]
            );

            await catchRevert(groupInstance.methods['changeMemberRole(uint256,address,uint8,bytes,uint256)'](
                groupId,
                accounts[0],
                memberRole,
                chgSig,
                await getNonce(accounts[0]),
                { from: accounts[0] }
            ));
        })

        it('should fail to change a member because member does not belong to group', async() => {
          await stageNewGroup(accounts[0], emptyHashArray, emptyRolesArray);

          await catchRevert(
              changeMemberRole(accounts[1], accounts[1], adminRole)
          );

        });

        it('should fail to add another member if not admin of group', async () => {
            // stage new group, accounts[0] is admin
            await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            await catchRevert(
              stagePrepAndStoreInv(
                  accounts[1], // wrong account
              )
            );
        });

        it('should allow a member to leave group', async () => {
            let newGroup            = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let acceptInv           = await stagePrepInvAndAccept(
                groupId,
                adminRole,
                accounts[0],
                accounts[1]
            );

            assert.equal(
                await groupInstance.isMember.call(
                    groupId,
                    accounts[1]
                ),
                true
            );

            let prepLeaveGroup      = await groupInstance.prepareLeaveGroup(
                groupId,
                await getNonce(accounts[1])
            );

            let sig                 = await web3.eth.sign(
                prepLeaveGroup,
                web3.utils.toChecksumAddress(accounts[1])
            );

            let leaveGroup          = await groupInstance.leaveGroup(
                groupId,
                sig,
                await getNonce(accounts[1])
            );

            await catchRevert(groupInstance.isMember.call(
                groupId,
                accounts[1]
                )
            );
        })

        it('should allow a member to leave group as a direct-tx', async () => {
            let newGroup            = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            await stagePrepInvAndAccept(
                groupId,
                adminRole,
                accounts[0],
                accounts[1]
            );

            // ensure the member belongs to the group before calling 'leaveGroup(uint256)'
            assert.equal(
                await groupInstance.isMember.call(
                    groupId,
                    accounts[1]
                ),
                true
            );

            // must use truffle's overloaded solidity mechanism here,
            // or solidity thinks the '{ from: accounts[1] }' is the meta-tx function
            let leaveGroup          = await groupInstance.methods['leaveGroup(uint256)'](
                groupId,
                { from: accounts[1] }
            );

            await catchRevert(groupInstance.isMember.call(
                groupId,
                accounts[1]
                )
            );
        })

        it('should revert on leave group if used does not already belong to group', async () => {
            let newGroup            = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            await stagePrepInvAndAccept(
                groupId,
                adminRole,
                accounts[0],
                accounts[1]
            );

            // ensure one other member belongs to the group before calling 'leaveGroup(uint256)'
            // with an address that doesn't belong to the group
            assert.equal(
                await groupInstance.isMember.call(
                    groupId,
                    accounts[1]
                ),
                true
            );

            // now we call direct-tx 'leaveGroup' with accounts[2]
            // must use truffle's overloaded solidity mechanism here,
            // or solidity thinks the '{ from: accounts[2] }' is the meta-tx function
            await catchRevert(groupInstance.methods['leaveGroup(uint256)'](
                groupId,
                { from: accounts[2] }
                )
            );

            assert.equal(
                await groupInstance.isMember.call(
                    groupId,
                    accounts[1]
                ),
                true
            );

            //await catchRevert(groupInstance.isMember.call(
            //    groupId,
            //    accounts[1]
            //    )
            //);
        })

        it('should store an invitation in pending state', async () => {
            let newGroup            = await stageNewGroup(
                accounts[0],
                emptyHashArray,
                emptyRolesArray
            );

            let prepInvAndAccept    = await stagePrepAndStoreInv(
                accounts[0]
            );

            let invState            = await groupInstance.getInvitationState.call(
                groupId,
                secHash01
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

            let prepStageAndStore   = await stagePrepAndStoreInv(
                accounts[0]
            );

            let revoke              = await prepAndRevokeInvitation(
                accounts[0]
            );

            let invState            = await groupInstance.getInvitationState.call(
                groupId,
                secHash01
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
            let prepRevoke      = await groupInstance.prepareRevokeInvitation(
                groupId,
                secHash01,
                await getNonce(addr)
            );

            let sig             = await web3.eth.sign(
                prepRevoke,
                web3.utils.toChecksumAddress(addr)
            );

            let revokeInv       = await groupInstance.revokeInvitation(
                groupId,
                secHash01,
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

        async function stagePrepAndStoreInv(adminAddr) {
            let prepNonce       = await getNonce(adminAddr);

            let msgHash         = await groupInstance.prepareInvitation(
                groupId,
                memberRole,
                secHash01,
                prepNonce
            );

            let sig             = await web3.eth.sign(
                msgHash,
                web3.utils.toChecksumAddress(adminAddr)
            );

            let storeNonce      = await getNonce(adminAddr);

            let invStored       = await groupInstance.storeInvitation(
                groupId,
                memberRole,
                secHash01,
                sig,
                storeNonce
            );

            return invStored;
        };

        async function stagePrepInvAndAccept(groupId, role, adminAddr, recipientAddr) {
            let prepInvNonce    = await getNonce(adminAddr);
            let msgHash         = await groupInstance.prepareInvitation(
                groupId,
                role,
                secHash01,
                prepInvNonce
            );

            let sig             = await web3.eth.sign(
                msgHash,
                web3.utils.toChecksumAddress(adminAddr)
            );

            let storeInvNonce   = await getNonce(adminAddr);
            let storedInv       = await groupInstance.storeInvitation(
                groupId,
                role,
                secHash01,
                sig,
                storeInvNonce
            );

            let addrSecretHash = web3.utils.soliditySha3(
                secret,
                recipientAddr
            );

            let prepAccInvNonce = await getNonce(recipientAddr);
            let prepHash        = await groupInstance.prepareAcceptInvitationCommit(
                groupId,
                addrSecretHash,
                prepAccInvNonce
            );

            let prepSig         = await web3.eth.sign(
                prepHash,
                web3.utils.toChecksumAddress(recipientAddr)
            );

            let accInvNonce     = await getNonce(recipientAddr);
            let acceptInvCommit = await groupInstance.acceptInvitationCommit(
                groupId,
                addrSecretHash,
                prepSig,
                accInvNonce
            );

            let acceptInv       = await groupInstance.acceptInvitation(
                groupId,
                secret,
                recipientAddr
            );

        };

        async function metaAcceptInv(groupCreator, accountToInvite, secret, userRole) {
            let secretHashArray = [];
            let rolesArray = [];

            let prepGroupNonce = await getNonce(groupCreator);

            let prepHash = await groupInstance.prepareCreateGroup(
                METADATA_HASH,
                secretHashArray,
                rolesArray,
                prepGroupNonce
            );

            let sig = await web3.eth.sign(
                prepHash,
                web3.utils.toChecksumAddress(groupCreator)
            );

            await groupInstance.methods['createGroup(bytes32,bytes32[],uint8[],bytes,uint256)'](
                METADATA_HASH,
                secretHashArray,
                rolesArray,
                sig,
                prepGroupNonce
            );
           
            let newNonce = await getNonce(groupCreator);
            let invHash = await groupInstance.prepareInvitation(
                groupId,
                userRole,
                secHash01,
                newNonce
            );

            let invSig = await web3.eth.sign(
                prepHash,
                web3.utils.toChecksumAddress(groupCreator)
            );

            await groupInstance.methods['storeInvitation(uint256,uint8,bytes32,bytes,uint256)'](
                groupId,
                userRole,
                secHash01,
                invSig,
                newNonce
            );

            //let addressSecretHash = await web3.utils.soliditySha3(
            //    accountToInvite,
            //    secret 
            //);

            //let acceptHash = await groupInstance.prepareAcceptInvitationCommit(
            //    groupId,
            //    addressSecretHash,
            //    await getNonce(accountToInvite)
            //);

            //let acceptSig = await web3.eth.sign(
            //    acceptHash,
            //    accountToInvite
            //);

            //await groupInstance.methods['acceptInvitationCommit(uint256,bytes32,bytes,uint256)'](
            //    groupId,
            //    addressSecretHash,
            //    acceptSig,
            //    await getNonce(accountToInvite)
            //);

            //await groupInstance.acceptInvitation(
            //    groupId,
            //    secret,
            //    accountToInvite
            //);
            
        }

        async function directAcceptInv(groupCreator, accountToInvite, secret, userRole) {
            let secretHashArray = [];
            let rolesArray = [];

            await groupInstance.methods['createGroup(bytes32,bytes32[],uint8[])'](
                METADATA_HASH, 
                secretHashArray, 
                rolesArray,
                { from: groupCreator }
            );

            await groupInstance.storeInvitation(
                groupId,
                userRole,
                hash(secret)
            );

            let addressSecretHash = web3.utils.soliditySha3(
                secret,
                accountToInvite
            );

            await groupInstance.acceptInvitationCommit(
                groupId,
                addressSecretHash,
                {from: accountToInvite}
            );

            await groupInstance.acceptInvitation(
                groupId,
                secret,
                accountToInvite
            );

        }

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

    });

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

    //////////////////////////////////////////////////
    // HASH function
    //////////////////////////////////////////////////

    function hash(toHash) {
        return web3.utils.keccak256(toHash);
    }

})();
