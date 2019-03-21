var KauriBadgeController = artifacts.require('KauriBadgeController.sol');
var KauriBadgeToken = artifacts.require('KauriBadgeToken.sol');
var Storage = artifacts.require('Storage.sol');
var AdminController = artifacts.require('OnlyOwnerAdminController.sol');
var MockCommunity = artifacts.require('MockCommunity.sol');
const getEvents = require('./helpers/getEvents').getEvents;
const assertRevert = require('./helpers/assertRevert').assertRevert;
const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;
const core = require('./helpers/core');
const hashHelper = require('./helpers/hash');
const ethJs = require('ethereumjs-util');

contract('KauriBadgeController', function(accounts) {

  it('should mint a kauri badge when redeeming 5 community approval proofs', redeploy(accounts[0], accounts, async (underTest, kauriBadge, communityId) => {
    let signatures = [await createCommunityApprovalSignature(communityId, web3.utils.soliditySha3("0"), accounts[0], accounts[9]),
                      await createCommunityApprovalSignature(communityId, web3.utils.soliditySha3("1"), accounts[0], accounts[9]),
                      await createCommunityApprovalSignature(communityId, web3.utils.soliditySha3("2"), accounts[0], accounts[9]),
                      await createCommunityApprovalSignature(communityId, web3.utils.soliditySha3("3"), accounts[0], accounts[9]),
                      await createCommunityApprovalSignature(communityId, web3.utils.soliditySha3("4"), accounts[0], accounts[9])];

    let communityIds = [];
    let articleIds = [];
    let vValues = [];
    let rValues = [];
    let sValues = [];

    for (var i = 0; i < signatures.length; i++) {
      communityIds.push(communityId);
      articleIds.push(web3.utils.soliditySha3(i.toString()));
      vValues.push(signatures[i].v);
      rValues.push(signatures[i].r);
      sValues.push(signatures[i].s);
    }

    await underTest.addCommunityApprovalProofs(communityIds, articleIds, vValues, rValues, sValues, { from: accounts[0] });
  }));

});

async function createCommunityApprovalSignature(communityId, articleId, creatorAddress, signerAccount) {
  if (communityId == "") { communityId = web3.utils.padRight(ethJs.bufferToHex(new Buffer(community)));};
  let hash = web3.utils.soliditySha3(web3.utils.padRight(ethJs.bufferToHex(new Buffer('KAURI_COMM_APP'))),
                       web3.utils.padRight(communityId, 64),
                       articleId,
                       creatorAddress);



  let sig = await hashHelper.web3Sign(hash,signerAccount);
  sig = sig.substr(2, sig.length);
  let r = '0x' + sig.substr(0, 64);
  let s = '0x' + sig.substr(64, 64);
  let v = web3.utils.toDecimal(sig.substr(128, 2)) + 27;

  return {"r": r, "s": s, "v": v};
}

function redeploy(deployer, accounts, testFunction) {

  var wrappedFunction = async () => {
    let storageContract = await Storage.new({ from: deployer});
    let communityContract = await MockCommunity.new({ from: deployer });
    let adminController = await AdminController.new({ from: deployer });
    let kauriBadgeContract = await KauriBadgeToken.new({ from: deployer });
    let kauriBadgeController = await KauriBadgeController.new({ from: deployer });

    await storageContract.setAdminController(adminController.address, { from: deployer });
    await communityContract.setAdminController(adminController.address, { from: deployer });
    await kauriBadgeController.setAdminController(adminController.address, { from: deployer });

    await kauriBadgeController.setCommunityContractAddress(communityContract.address, { from: deployer });

    await kauriBadgeController.setStorageContractAddress(storageContract.address, { from: deployer });
    await storageContract.addWritePermission(kauriBadgeController.address, {from: deployer});

    await kauriBadgeController.setKauriBadgeContractAddress(kauriBadgeContract.address, { from: deployer });

    let communityId = await core.createCommunity(communityContract, accounts);

    await testFunction(kauriBadgeController, kauriBadgeContract, communityId);
  };

  return wrappedFunction;
}
