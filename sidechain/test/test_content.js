const { soliditySha3 } = require("web3-utils");

const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const assertRevert = require('./exceptions.js').catchRevert;
const ipfsHash = require('./helpers/ipfsHash.js');

const spaceCreator = 5;

const Storage = artifacts.require('Storage.sol');
const AdminController = artifacts.require("OnlyOwnerAdminController.sol");
const Content = artifacts.require('ContentConnector.sol');
const Group = artifacts.require("GroupConnector.sol");

const spaceKey = web3.utils.keccak256('keyOne');
const spaceKey2 = web3.utils.keccak256('keyTwo');

const ipfsBytes1 = ipfsHash.getBytes32FromIpfsHash('QmaozNR7DZHQK1ZcU9p7QdrshMvXqWK6gpu5rmrkPdT3L4');
const ipfsBytes2 = ipfsHash.getBytes32FromIpfsHash('QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u');
const ipfsBytes3 = ipfsHash.getBytes32FromIpfsHash('QmcaHpwn3bs9DaeLsrk9ZvVxVcKTPXVWiU1XdrGNW9hpi3');

const PUBLISHED_STATUS = 2;

contract('Content', function(accounts) {

  let content;
  let group;

  beforeEach(async () => {
    let storage = await Storage.new();
    let adminController = await AdminController.new();
    content = await Content.new();
    group = await Group.new();

    await storage.setAdminController(adminController.address);
    await group.setAdminController(adminController.address);
    await group.setStorageContractAddress(storage.address);
    await storage.addWritePermission(group.address);

    // add additional role '2' (member/moderator)
    await group.addRoles([2]);

    await content.setAdminController(adminController.address);
    await content.setStorageContractAddress(storage.address);
    await content.setGroupContractAddress(group.address);
    await storage.addWritePermission(content.address);
  });

  it('can create a new content space', async () => {
    
    await content.createContentSpace(spaceKey);

    //No error, happy days!
  });

  it('can create a new content space owned by a group', async () => {

    let groupId = await createGroup(accounts[0]);

    await createContentSpace(spaceKey, numToBytes32(groupId), 1, accounts[0]);

    //No error, happy days!
  });

  it('emits a SpaceCreated event after content space creation', async () => {

    let creationReceipt = await content.createContentSpace(spaceKey);

    assert.equal(creationReceipt.logs.length, 1);

    let spaceCreatedEvent = creationReceipt.logs[0];
    assert.equal(spaceCreatedEvent.event, 'SpaceCreated');
    assert.equal(spaceCreatedEvent.args[0], spaceKey);
    assert.equal(spaceCreatedEvent.args[1], addressToBytes32(accounts[0]));
  });

  it('should not allow a space to be created with an existing id', async () => {

    await content.createContentSpace(spaceKey);

    await assertRevert(content.createContentSpace(spaceKey));
  });

  it('can transfer a content space to another account as the owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[1]), 0);

    //No error, happy days!
  });

  it('can transfer a content space to a group as the owner', async () => {
    
    let groupId = await createGroup(accounts[0]);

    await content.createContentSpace(spaceKey);

    await transferContentSpaceOwnership(spaceKey, numToBytes32(groupId), 1);

    //No error, happy days!
  });

  it('emits a SpaceTransferred event after a content space transfer', async () => {
    
    await content.createContentSpace(spaceKey);

    let transferReceipt = await transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[1]), 0);

    assert.equal(transferReceipt.logs.length, 1);

    let spaceTranferredEvent = transferReceipt.logs[0];
    assert.equal(spaceTranferredEvent.event, 'SpaceTransferred');
    assert.equal(spaceTranferredEvent.args[0], spaceKey);
    assert.equal(spaceTranferredEvent.args[1], addressToBytes32(accounts[0]));
    assert.equal(spaceTranferredEvent.args[2], 0);
    assert.equal(spaceTranferredEvent.args[3], addressToBytes32(accounts[1]));
    assert.equal(spaceTranferredEvent.args[4], 0);
    assert.equal(spaceTranferredEvent.args[5], accounts[0]);
  });

  it('can publish content from group member after ownership transferred to group', async () => {
    
    let groupId = await createGroup(accounts[3]);
    
    await content.createContentSpace(spaceKey);
    
    await transferContentSpaceOwnership(spaceKey, numToBytes32(groupId), 1);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0, 3);
    
    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPublished');
  });

  it('can publish content after ownership transferred to author', async () => {
    
    await content.createContentSpace(spaceKey);

    await transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[3]), 0);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0, 3);
    
    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPublished');
  });

  it('original owner cant publish content after ownership transferred', async () => {
    
    await content.createContentSpace(spaceKey);

    await transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[3]), 0);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0);
    
    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPending');
  });

  it('original owner cant transfer space after ownership already transferred', async () => {
    
    await content.createContentSpace(spaceKey);

    await transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[3]), 0);

    await assertRevert(content.transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[3]), 0));
  });

  it('can transfer to another user after being transferred space', async () => {
    
    await content.createContentSpace(spaceKey);

    await transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[3]), 0);

    await transferContentSpaceOwnership(spaceKey, addressToBytes32(accounts[5]), 0, accounts[3]);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0, 5);
    
    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPublished');
  });

  it('can transfer to another group after being transferred space', async () => {
    
    let groupId1 = await createGroup(accounts[3]);

    let groupId2 = await createGroup(accounts[5]);
    
    await content.createContentSpace(spaceKey);
    
    await transferContentSpaceOwnership(spaceKey, numToBytes32(groupId1), 1);

    await transferContentSpaceOwnership(spaceKey, numToBytes32(groupId2), 1, accounts[3]);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0, 5);
    
    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPublished');
  });

  it('should revert if transferring with empty space id', async () => {
    
    await content.createContentSpace(spaceKey);

    await assertRevert(transferContentSpaceOwnership('0x0', addressToBytes32(accounts[1]), 0));
  });

  it('should revert if transferring to 0 account', async () => {
    
    await content.createContentSpace(spaceKey);

    await assertRevert(transferContentSpaceOwnership(spaceKey, "0x0", 0));
  });

  it('should revert if transferring non existent space', async () => {
    
    await content.createContentSpace(spaceKey);

    await assertRevert(transferContentSpaceOwnership(spaceKey2, addressToBytes32(accounts[1]), 0));
  });

  it('should revert if transferring from non owner account', async () => {
    
    await content.createContentSpace(spaceKey);

    await assertRevert(transferContentSpaceOwnership(spaceKey2, addressToBytes32(accounts[1]), 0, accounts[1]));
  });

  it('can push a content revision as space owner', async () => {
    
    await content.createContentSpace(spaceKey);

    let receipt = await pushRevision(spaceKey, ipfsBytes1, 0);
    let timestamp = await getBlockTimestamp(receipt)

    let revision = await getRevision(spaceKey, 1);
    verifySavedRevision(revision, ipfsBytes1, 0, accounts[0], timestamp, PUBLISHED_STATUS);
  });

  it('emits a RevisionPublished event when owner pushes revision', async () => {
    
    await content.createContentSpace(spaceKey);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0);

    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPublished');

    assert.equal(publishedEvent.args[0], spaceKey);
    assert.equal(publishedEvent.args[1], 1);
    assert.equal(publishedEvent.args[2], ipfsBytes1);
    assert.equal(publishedEvent.args[3], 0);
    assert.equal(publishedEvent.args[4], accounts[0]);
  });

  it('emits a RevisionPublished event when owning group member pushes revision', async () => {
    
    let groupId = await createGroup(accounts[0]);
    
    await createContentSpace(spaceKey, numToBytes32(groupId), 1);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0);

    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPublished');

    assert.equal(publishedEvent.args[0], spaceKey);
    assert.equal(publishedEvent.args[1], 1);
    assert.equal(publishedEvent.args[2], ipfsBytes1);
    assert.equal(publishedEvent.args[3], 0);
    assert.equal(publishedEvent.args[4], accounts[0]);
  });

  it('can push a content revision as non-space owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);
  });

  it('emits a RevisionPending event when non-owner pushes revision', async () => {
    
    await content.createContentSpace(spaceKey);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPending');

    assert.equal(publishedEvent.args[0], spaceKey);
    assert.equal(publishedEvent.args[1], 1);
    assert.equal(publishedEvent.args[2], ipfsBytes1);
    assert.equal(publishedEvent.args[3], 0);
    assert.equal(publishedEvent.args[4], accounts[1]);
  });

  it('emits a RevisionPending event when non group member pushes revision', async () => {
    
    await createGroup(accounts[1]);
    let groupId = await createGroup(accounts[0]);
    
    await createContentSpace(spaceKey, numToBytes32(groupId), 1, accounts[1]);

    let pushReceipt = await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    assert.equal(pushReceipt.logs.length, 1);
    
    let publishedEvent = pushReceipt.logs[0];
    assert.equal(publishedEvent.event, 'RevisionPending');

    assert.equal(publishedEvent.args[0], spaceKey);
    assert.equal(publishedEvent.args[1], 1);
    assert.equal(publishedEvent.args[2], ipfsBytes1);
    assert.equal(publishedEvent.args[3], 0);
    assert.equal(publishedEvent.args[4], accounts[1]);
  });

  it('can push multiple content revisions', async () => {
    
    await content.createContentSpace(spaceKey);

    let receipt1 = await pushRevision(spaceKey, ipfsBytes1, 0);
    let receipt2 = await pushRevision(spaceKey, ipfsBytes2, 1);
    let receipt3 = await pushRevision(spaceKey, ipfsBytes3, 2);

    let revisions = await getRevisions(spaceKey);

    verifySavedRevision(revisions[0], ipfsBytes1, 0, accounts[0], await getBlockTimestamp(receipt1), 2, 1);
    verifySavedRevision(revisions[1], ipfsBytes2, 1, accounts[0], await getBlockTimestamp(receipt2), 2, 2);
    verifySavedRevision(revisions[2], ipfsBytes3, 2, accounts[0], await getBlockTimestamp(receipt3), 2, 3);

  });

  it('should not allow a revision to be pushed for a non existent space', async () => {
    
    await content.createContentSpace(spaceKey);

    await assertRevert(pushRevision(spaceKey2, ipfsBytes1, 0));
  });

  it('should not allow an initial revision to be pushed with a parent', async () => {
    
    await content.createContentSpace(spaceKey);

    await assertRevert(pushRevision(spaceKey, ipfsBytes1, 1));
  });

  it('should not allow a non-initial revision to be pushed without a parent', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0);

    await assertRevert(pushRevision(spaceKey, ipfsBytes1, 0));
  });

  it('should not allow a revision to be pushed with a non existent parent id', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0);

    await pushRevision(spaceKey, ipfsBytes2, 1);

    await assertRevert(pushRevision(spaceKey, ipfsBytes3, 3));
  });

  it('should not allow a revision to be pushed with no matching commit hash', async () => {
    
    await content.createContentSpace(spaceKey);

    let commitHash = soliditySha3(spaceKey, ipfsBytes2, 0, accounts[0]);

    await content.methods['pushRevisionCommit(bytes32)'](commitHash, {from: accounts[0]});
        
    await assertRevert(content.methods['pushRevision(bytes32,bytes32,uint256)'](spaceKey, ipfsBytes1, 0));
  });

  it('can approve revision as space owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await approveRevision(spaceKey, 1, ipfsBytes1);
  });

  it('can approve revision as space group member', async () => {
    
    let groupId = await createGroup(accounts[2]);
    
    await createContentSpace(spaceKey, numToBytes32(groupId), 1);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await approveRevision(spaceKey, 1, ipfsBytes1, accounts[2]);
  });

  it('can approve multiple revisions as space owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);
    await approveRevision(spaceKey, 1, ipfsBytes1);

    await pushRevision(spaceKey, ipfsBytes2, 1, 1);
    await approveRevision(spaceKey, 2, ipfsBytes2);

    await pushRevision(spaceKey, ipfsBytes3, 2, 1);
    await approveRevision(spaceKey, 3, ipfsBytes3);
  });

  it('emits a RevisionApproved and RevisionPublished event on approval', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    let approveReceipt = await approveRevision(spaceKey, 1, ipfsBytes1);

    let approvedEvent = approveReceipt.logs[0];
    assert.equal(approvedEvent.event, 'RevisionApproved');

    assert.equal(approvedEvent.args[0], spaceKey);
    assert.equal(approvedEvent.args[1], 1);
    assert.equal(approvedEvent.args[2], ipfsBytes1);
    assert.equal(approvedEvent.args[3], 0);
    assert.equal(approvedEvent.args[4], accounts[1]);
    assert.equal(approvedEvent.args[5], accounts[0]);

    let publishedEvent = approveReceipt.logs[1];
    assert.equal(publishedEvent.event, 'RevisionPublished');

    assert.equal(publishedEvent.args[0], spaceKey);
    assert.equal(publishedEvent.args[1], 1);
    assert.equal(publishedEvent.args[2], ipfsBytes1);
    assert.equal(publishedEvent.args[3], 0);
    assert.equal(publishedEvent.args[4], accounts[1]);
  });

  it('should not allow approval from non-owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(approveRevision(spaceKey, 1, ipfsBytes1, accounts[1]));
  });

  it('should not allow approval from non group member', async () => {
    
    let groupId = await createGroup(accounts[2]);
    
    await createContentSpace(spaceKey, numToBytes32(groupId), 1);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(approveRevision(spaceKey, 1, ipfsBytes1, accounts[3]));
  });

  it('should not allow approval if space doesnt exist', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(approveRevision(spaceKey2, 1, ipfsBytes1));
  });

  it('should not allow approval for invalid revision id', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(content.approveRevision(spaceKey, 2, ipfsBytes1));
  });

  it('should not allow approval if hash doesnt match', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(content.approveRevision(spaceKey, 1, ipfsBytes2));
  });

  it('should not allow approval if state is PUBLISHED', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await approveRevision(spaceKey, 1, ipfsBytes1)

    await assertRevert(approveRevision(spaceKey, 1, ipfsBytes1));
  });

  it('should not allow an empty space id when approving', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(content.approveRevision('0x0', 1, ipfsBytes1));
  });

  it('should not allow an empty revision id when approving', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(content.approveRevision(spaceKey, 0, ipfsBytes1));
  });

  it('should not allow an empty hash when approving', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(approveRevision(spaceKey, 1, '0x0'));
  });

  it('can reject revision as space owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await rejectRevision(spaceKey, 1, ipfsBytes1);
  });

  it('can reject multiple revisions as space owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);
    await rejectRevision(spaceKey, 1, ipfsBytes1);

    await pushRevision(spaceKey, ipfsBytes2, 1, 1);
    await rejectRevision(spaceKey, 2, ipfsBytes2);

    await pushRevision(spaceKey, ipfsBytes3, 2, 1);
    await rejectRevision(spaceKey, 3, ipfsBytes3);
  });

  it('emits a RevisionRejected event on rejection', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    let rejectedReceipt = await content.rejectRevision(spaceKey, 1, ipfsBytes1);

    assert.equal(rejectedReceipt.logs.length, 1);

    let rejectedEvent = rejectedReceipt.logs[0];
    assert.equal(rejectedEvent.event, 'RevisionRejected');

    assert.equal(rejectedEvent.args[0], spaceKey);
    assert.equal(rejectedEvent.args[1], 1);
    assert.equal(rejectedEvent.args[2], ipfsBytes1);
    assert.equal(rejectedEvent.args[3], 0);
    assert.equal(rejectedEvent.args[4], accounts[1]);
    assert.equal(rejectedEvent.args[5], accounts[0]);
  });

  it('should not allow rejection from non-owner', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(rejectRevision(spaceKey, 1, ipfsBytes1, accounts[1]));
  });

  it('should not allow rejection if space doesnt exist', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(content.rejectRevision(spaceKey2, 1, ipfsBytes1));
  });

  it('should not allow rejection for invalid revision id', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(content.rejectRevision(spaceKey, 2, ipfsBytes1));
  });

  it('should not allow rejection if hash doesnt match', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(rejectRevision(spaceKey, 1, ipfsBytes2));
  });

  it('should not allow rejection if state is PUBLISHED', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await approveRevision(spaceKey, 1, ipfsBytes1)

    await assertRevert(rejectRevision(spaceKey, 1, ipfsBytes1));
  });

  it('should not allow rejection if state is REJECTED', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await content.rejectRevision(spaceKey, 1, ipfsBytes1)

    await assertRevert(content.rejectRevision(spaceKey, 1, ipfsBytes1));
  });

  it('should not allow an empty space id when rejecting', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(content.rejectRevision('0x0', 1, ipfsBytes1));
  });

  it('should not allow an empty revision id when rejecting', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(rejectRevision(spaceKey, 0, ipfsBytes1));
  });

  it('should not allow an empty hash when rejecting', async () => {
    
    await content.createContentSpace(spaceKey);

    await pushRevision(spaceKey, ipfsBytes1, 0, 1);

    await assertRevert(rejectRevision(spaceKey, 1, '0x0'));
  });

  //META TRANSACTION TESTS
  it('can create a content space and push revision with meta transactions', async () => {
    
    await createContentSpaceMeta(spaceKey);

    await pushRevisionMeta(spaceKey, ipfsBytes1, 0);
  });

  it('can transfer a content space with meta transactions', async () => {
    
    await createContentSpaceMeta(spaceKey);

    await transferContentSpaceOwnershipMeta(spaceKey, accounts[5], 0);
  });

  it('can approve a revision with meta transactions', async () => {
    
    await createContentSpaceMeta(spaceKey);

    await pushRevisionMeta(spaceKey, ipfsBytes1, 0, accounts[1]);

    await approveRevisionMeta(spaceKey, 1, ipfsBytes1);
  });

  it('can reject a revision with meta transactions', async () => {
    
    await createContentSpaceMeta(spaceKey);

    await pushRevisionMeta(spaceKey, ipfsBytes1, 0, accounts[1]);

    await rejectRevisionMeta(spaceKey, 1, ipfsBytes1);
  });

  async function createGroup(fromAccount) {
    let receipt = await group.methods['createGroup(bytes32,bytes32[],uint8[])']
        (ipfsBytes1, [], [], {from: fromAccount});

    //Get group id from event
    return parseInt(receipt.logs[0].args[0], 10);
  }

  async function createContentSpace(spaceId, owner, ownerType, fromAccount) {

    if (!fromAccount) { fromAccount = accounts[0];}
    let receipt = await content.methods['createContentSpace(bytes32,bytes32,uint8)']
        (spaceId, owner, ownerType, {from: fromAccount});

    return receipt;
  }

  async function createContentSpaceMeta(spaceId, owner, ownerType, account) {
    
    if (!account) { account = accounts[0];}
    let nonce = await getNonce(account);
    let msgHash = await content.prepareCreateContentSpace.call(spaceId, nonce);

    let sig = await web3.eth.sign(msgHash, web3.utils.toChecksumAddress(account));
    let receipt = await content.methods['createContentSpace(bytes32,bytes,uint256)']
        (spaceId, sig, nonce, {from: accounts[9]});

    return receipt;
  }

  async function transferContentSpaceOwnership(spaceId, newOwner, newOwnerType, fromAccount) {
    
    if (!fromAccount) { fromAccount = accounts[0];}
    let receipt = await content.methods['transferContentSpaceOwnership(bytes32,bytes32,uint8)']
        (spaceId, newOwner, newOwnerType, {from: fromAccount});

    return receipt;
  }

  async function transferContentSpaceOwnershipMeta(spaceId, newOwner, newOwnerType, account) {
    
    if (!account) { account = accounts[0];}

    let nonce = await getNonce(account);
    let msgHash = await content.prepareTransferContentSpaceOwnership.call(spaceId, newOwner, newOwnerType, nonce);
    let sig = await web3.eth.sign(msgHash, web3.utils.toChecksumAddress(account));
    let receipt = await content.methods['transferContentSpaceOwnership(bytes32,bytes32,uint8,bytes,uint256)']
        (spaceId, newOwner, newOwnerType, sig, nonce, {from: accounts[9]});

    return receipt;
  }

  async function pushRevision(spaceKey, contentHash, parentRevision, fromAccountNumber) {

    if (!fromAccountNumber) { fromAccountNumber = 0; }
    let commitHash = soliditySha3(spaceKey, contentHash, parentRevision, accounts[fromAccountNumber]);

    await content.methods['pushRevisionCommit(bytes32)'](commitHash, {from: accounts[fromAccountNumber]});

    return await content.methods['pushRevision(bytes32,bytes32,uint256)']
        (spaceKey, contentHash, parentRevision, {from: accounts[fromAccountNumber]});
  }

  async function pushRevisionMeta(spaceKey, contentHash, parentRevision, account) {
    
    if (!account) { account = accounts[0]; }
    let commitHash = soliditySha3(spaceKey, contentHash, parentRevision, account);

    let nonce = await getNonce(account);
    let commitMsgHash = await content.preparePushRevisionCommit.call(commitHash, nonce);
    let commitSig = await web3.eth.sign(commitMsgHash, web3.utils.toChecksumAddress(account));
    await content.methods['pushRevisionCommit(bytes32,bytes,uint256)'](commitHash, commitSig, nonce, {from: accounts[9]});

    nonce = await getNonce(account);
    let pushMsgHash = await content.preparePushRevision.call(spaceKey, contentHash, parentRevision, nonce);
    let pushSig = await web3.eth.sign(pushMsgHash, web3.utils.toChecksumAddress(account));
    return await content.methods['pushRevision(bytes32,bytes32,uint256,bytes,uint256)']
        (spaceKey, contentHash, parentRevision, pushSig, nonce, {from: accounts[9]});
  }

  async function approveRevision(spaceKey, revisionId, contentHash, fromAccount) {
    
    if (!fromAccount) { fromAccount = accounts[0] }

    return await content.methods['approveRevision(bytes32,uint256,bytes32)']
          (spaceKey, revisionId, contentHash, {from: fromAccount});
  }

  async function approveRevisionMeta(spaceKey, revisionId, contentHash, account) {
    
    if (!account) { account = accounts[0] }

    let nonce = await getNonce(account);
    let msgHash = await content.prepareApproveRevision.call(spaceKey, revisionId, contentHash, nonce);
    let sig = await web3.eth.sign(msgHash, web3.utils.toChecksumAddress(account));

    return await content.methods['approveRevision(bytes32,uint256,bytes32,bytes,uint256)']
          (spaceKey, revisionId, contentHash, sig, nonce, {from: accounts[9]});
  }

  async function rejectRevision(spaceKey, revisionId, contentHash, fromAccount) {
    
    if (!fromAccount) { fromAccount = accounts[0] }

    return await content.methods['rejectRevision(bytes32,uint256,bytes32)']
          (spaceKey, revisionId, contentHash, {from: fromAccount});
  }

  async function rejectRevisionMeta(spaceKey, revisionId, contentHash, account) {
    
    if (!account) { account = accounts[0] }
    
    let nonce = await getNonce(account);
    let msgHash = await content.prepareRejectRevision.call(spaceKey, revisionId, contentHash, nonce);
    let sig = await web3.eth.sign(msgHash, web3.utils.toChecksumAddress(account));

    return await content.methods['rejectRevision(bytes32,uint256,bytes32,bytes,uint256)']
          (spaceKey, revisionId, contentHash, sig, nonce, {from: accounts[9]});
  }

  async function getNonce(addr) {
    return await content.getNonce.call(addr);
  }

  function revisionNormalise(revisions, index) {
    let revision = [];

    revision[0] = revisions['ids'][index];
    revision[1] = revisions['hashes'][index];
    revision[2] = revisions['parents'][index];
    revision[3] = revisions['authors'][index];
    revision[4] = revisions['timestamps'][index];
    revision[5] = revisions['states'][index];

    return revision;
  }

  async function getRevision(spaceId, revisionId) {
    return await content.getRevision.call(spaceId, revisionId);
  }

  async function getRevisions(spaceId) {
    let normalized = [];
    let revisions = await content.getRevisions.call(spaceId);

    for(let i = 0; i < revisions[0].length; i++) {
      normalized.push(revisionNormalise(revisions, i));
    }

    return normalized;
  }

  function verifySavedRevision(revision, hash, parent, author, timestamp, state, revisionId) {

    let offset = 0;

    if (revisionId) { 
      offset = 1;
      assert.equal(revision[0], revisionId);
    }

    assert.equal(revision[offset + 0], hash);
    assert.equal(revision[offset + 1], parent);
    assert.equal(revision[offset + 2], author);
    assert.equal(revision[offset + 3], timestamp);
    assert.equal(revision[offset + 4], state);
  }

});

function padToBytes32(n) {
  while (n.length < 64) {
      n = "0" + n;
  }
  return "0x" + n;
}

function numToBytes32(num) {
  return padToBytes32(parseInt(num, 10).toString(16));
}

function addressToBytes32(address) {
  return padToBytes32(address.substring(2).toLowerCase());
}

async function getBlockTimestamp(txReceipt) {
  let block = await web3.eth.getBlock(txReceipt.receipt.blockHash);

  return block.timestamp;
}
