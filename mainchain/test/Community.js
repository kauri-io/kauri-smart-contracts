var Community = artifacts.require('Community.sol');
var Storage = artifacts.require('Storage.sol');
var AdminController = artifacts.require('OnlyOwnerAdminController.sol');
const getEvents = require('./helpers/getEvents').getEvents;
const ipfsHash = require('./helpers/ipfsHash');
const assertRevert = require('./helpers/assertRevert').assertRevert;
const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const ethJs = require('ethereumjs-util');

const IPFS_HASH = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
const METADATA_HASH = ipfsHash.getBytes32FromIpfsHash(IPFS_HASH);

const ADMIN_ONE_INDEX = 0;
const ADMIN_TWO_INDEX = 1;
const CURATOR_ONE_INDEX = 2;
const CURATOR_TWO_INDEX = 3;
const GENERAL_USER_INDEX = 4;

const ROLE_CURATOR = 0;
const ROLE_ADMIN = 1;

contract('Community', function(accounts) {

  it('should allow anyone to create a new community', redeploy(accounts[0], async (underTest) => {
    await addCommunity(underTest);
  }));

  it('should add defined admin on creation of community', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    let isAdmin = await underTest.isAdmin(id, accounts[ADMIN_ONE_INDEX]);
    assert.equal(isAdmin, true, "Admin not set on creation");
  }));

  it('should not add defined curator as a admin on creation of community', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    let isAdmin = await underTest.isAdmin(id, accounts[CURATOR_ONE_INDEX]);
    assert.equal(isAdmin, false, "Curator set as admin!");
  }));

  it('should add defined curator on creation of community', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    let isCurator = await underTest.isCurator(id, accounts[CURATOR_ONE_INDEX]);
    assert.equal(isCurator, true, "Curator not set on creation");
  }));

  it('should not add defined admin as a curator on creation of community', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    let isCurator = await underTest.isCurator(id, accounts[ADMIN_ONE_INDEX]);
    assert.equal(isCurator, false, "Admin set as curator!");
  }));

  it('should fire a CommunityCreated event after community creation', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);

    var created = underTest.getPastEvents('CommunityCreated',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(created);
    assert.equal(web3.utils.hexToUtf8(logs[0].args.communityId), web3.utils.hexToUtf8(id), "Community id not set correctly");
    assert.equal(logs[0].args.metadataLocator, METADATA_HASH, "Metadata locator not set correctly");
  }));

  it('should allow an admin to add another admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    let isAdmin = await underTest.isAdmin(id, accounts[ADMIN_TWO_INDEX]);
    assert.equal(isAdmin, true, "Admin not set correctly");
  }));

  it('should fire an MemberEnabled event after admin added', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});

    var added = underTest.getPastEvents('MemberEnabled',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(added);
    assert.equal(web3.utils.hexToUtf8(logs[logs.length-1].args.communityId), web3.utils.hexToUtf8(id), "Community id not set correctly");
    assert.equal(logs[logs.length-1].args.member, accounts[ADMIN_TWO_INDEX], "Admin address not set correctly");
    assert.equal(logs[logs.length-1].args.role, ROLE_ADMIN, "Admin role not set correctly");
  }));

  it('should not set added admin as a curator', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    let isCurator = await underTest.isCurator(id, accounts[ADMIN_TWO_INDEX]);
    assert.equal(isCurator, false, "Admin set as curator!");
  }));

  it('should not allow an admin to add a zero address as an admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await assertRevert(underTest.addAdmin(id, '0x0000000000000000000000000000000000000000', {from: accounts[ADMIN_ONE_INDEX]}),
      'Allowed a 0x0 address!');
  }));

  it('should not allow a curator to add a new admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await assertRevert(underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[CURATOR_ONE_INDEX]}),
      'Allowed the non admin to add a curator!');
  }));

  it('should not allow a non-community account to add a new admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await assertRevert(underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[GENERAL_USER_INDEX]}),
      'Allowed the non admin to add a curator!');
  }));

  it('should allow an admin to add a curator', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addCurator(id, accounts[CURATOR_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    let isCurator = await underTest.isCurator(id, accounts[CURATOR_TWO_INDEX]);
    assert.equal(isCurator, true, "Curator not set correctly");
  }));

  it('should fire a MemberEnabled event after curator added', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addCurator(id, accounts[CURATOR_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});

    var added = underTest.getPastEvents('MemberEnabled',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(added);
    assert.equal(web3.utils.hexToUtf8(logs[logs.length-1].args.communityId), web3.utils.hexToUtf8(id), "Community id not set correctly");
    assert.equal(logs[logs.length-1].args.member, accounts[CURATOR_TWO_INDEX], "Curator address not set correctly");
    assert.equal(logs[logs.length-1].args.role, ROLE_CURATOR, "Curator role not set correctly");
  }));

  it('should not set added curator as a admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addCurator(id, accounts[CURATOR_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});

    let isAdmin = await underTest.isAdmin(id, accounts[CURATOR_TWO_INDEX]);
    assert.equal(isAdmin, false, "Curator set as admin!");
  }));

  it('should not allow an admin to add a zero address as a curator', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await assertRevert(underTest.addCurator(id, '0x0000000000000000000000000000000000000000', {from: accounts[ADMIN_ONE_INDEX]}),
      'Allowed a 0x0 address!');
  }));

  it('should not allow a curator to add a new curator', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await assertRevert(underTest.addCurator(id, accounts[CURATOR_TWO_INDEX], {from: accounts[CURATOR_ONE_INDEX]}),
      'Allowed the curator to add a curator!');
  }));

  it('should not allow a non-community account to add a new admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await assertRevert(underTest.addCurator(id, accounts[CURATOR_TWO_INDEX], {from: accounts[GENERAL_USER_INDEX]}),
      'Allowed the non admin to add a curator!');
  }));

  it('should allow an admin to disable an admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    await underTest.disableAdmin(id, accounts[ADMIN_ONE_INDEX], {from: accounts[ADMIN_TWO_INDEX]});
    let isAdmin = await underTest.isAdmin(id, accounts[ADMIN_ONE_INDEX]);
    assert.equal(isAdmin, false, "Admin not disabled");
  }));

  it('should fire a MemberDisabled event after admin disabled', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    await underTest.disableAdmin(id, accounts[ADMIN_ONE_INDEX], {from: accounts[ADMIN_TWO_INDEX]});

    var disabled = underTest.getPastEvents('MemberDisabled',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(disabled);
    assert.equal(web3.utils.hexToUtf8(logs[0].args.communityId), web3.utils.hexToUtf8(id), "Community id not set correctly");
    assert.equal(logs[0].args.member, accounts[ADMIN_ONE_INDEX], "Admin address not set correctly");
    assert.equal(logs[0].args.role, ROLE_ADMIN, "Admin role not set on event");
  }));

  it('should not allow a curator to disable an admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    await assertRevert(underTest.disableAdmin(id, accounts[ADMIN_ONE_INDEX], {from: accounts[CURATOR_ONE_INDEX]}),
      'Allowed the curator to disable a admin!');
  }));

  it('should not allow a non-community account to add a new admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addAdmin(id, accounts[ADMIN_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    await assertRevert(underTest.disableAdmin(id, accounts[ADMIN_ONE_INDEX], {from: accounts[GENERAL_USER_INDEX]}),
      'Allowed a non admin to disable an admin!');
  }));

  it('should allow an admin to disable a curator', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.disableCurator(id, accounts[CURATOR_ONE_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    let isCurator = await underTest.isCurator(id, accounts[CURATOR_ONE_INDEX]);
    assert.equal(isCurator, false, "Curator not disabled");
  }));

  it('should fire a MemberDisabled event after curator disabled', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.disableCurator(id, accounts[CURATOR_ONE_INDEX], {from: accounts[ADMIN_ONE_INDEX]});

    var disabled = underTest.getPastEvents('MemberDisabled',{fromBlock: 0, toBlock: 'latest'});
    let logs = await getEvents(disabled);
    assert.equal(web3.utils.hexToUtf8(logs[0].args.communityId), web3.utils.hexToUtf8(id), "Community id not set correctly");
    assert.equal(logs[0].args.member, accounts[CURATOR_ONE_INDEX], "Curator address not set correctly");
    assert.equal(logs[0].args.role, ROLE_CURATOR, "Curator role not set correctly");
  }));

  it('should not allow a curator to disable a curator', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await underTest.addCurator(id, accounts[CURATOR_TWO_INDEX], {from: accounts[ADMIN_ONE_INDEX]});
    await assertRevert(underTest.disableCurator(id, accounts[CURATOR_ONE_INDEX], {from: accounts[CURATOR_TWO_INDEX]}),
      'Allowed the curator to decativate a curator!');
  }));

  it('should not allow a non-community account to add a new admin', redeploy(accounts[0], async (underTest) => {
    let id = await addCommunity(underTest);
    await assertRevert(underTest.disableCurator(id, accounts[CURATOR_ONE_INDEX], {from: accounts[GENERAL_USER_INDEX]}),
      'Allowed a non admin to disable a curator!');
  }));

  async function addCommunity(contract) {
    let id = Math.floor(Math.random() * 1000) + '-' + Math.floor(Math.random() * 1000);
    id = ethJs.bufferToHex(new Buffer(id));
    await contract.createCommunity(id, [accounts[ADMIN_ONE_INDEX]],
      [accounts[CURATOR_ONE_INDEX]], METADATA_HASH, {from: accounts[9]});

    return id;
  }
});

function redeploy(deployer, testFunction) {

  var wrappedFunction = async () => {
    let storageContract = await Storage.new({ from: deployer});
    let communityContract = await Community.new({ from: deployer });
    let adminController = await AdminController.new({ from: deployer });

    await storageContract.setAdminController(adminController.address, { from: deployer });
    await communityContract.setAdminController(adminController.address, { from: deployer });

    await communityContract.setStorageContractAddress(storageContract.address, { from: deployer });
    await storageContract.addWritePermission(communityContract.address, {from: deployer});

    await testFunction(communityContract);
  };

  return wrappedFunction;
}
