const assertRevert = require('./helpers/assertRevert').assertRevert;
const fromAscii = require('./helpers/ascii').fromAscii;
const toAscii = require('./helpers/ascii').toAscii;

var Storage = artifacts.require('Storage.sol');

contract('Storage', function(accounts) {
  const writer = 5;
  const keyOne = web3.utils.toHex("keyOne");
  const keyTwo = web3.utils.toHex("keyTwo");
  const keyThree = web3.utils.toHex("keyThree");
  const keyFour = web3.utils.toHex("keyFour");
  const keyFive = web3.utils.toHex("keyFive");

  let storage;

  beforeEach(async () => {
    storage = await Storage.deployed()
    await storage.addWritePermission(accounts[writer], { from: accounts[0] });
  });

  it('sets a uint value with correct permission', async () => {
    await storage.putUintValue(keyOne, 123, { from: accounts[writer] });

    assert.equal(await storage.getUintValue.call(keyOne), 123);
  });

  it('should fail to set a uint value with incorrect permission', async () => {
    await assertRevert(storage.putUintValue(keyOne, 123, { from: accounts[0] }));
  });

  it('sets a bytes32 value with correct permission', async () => {
    await storage.putBytes32Value(keyOne, fromAscii("123"), { from: accounts[writer] });

    assert.equal(toAscii(await storage.getBytes32Value.call(keyOne)), "123");
  });

  it('should fail to set a bytes32 value with incorrect permission', async () => {
    await assertRevert(storage.putBytes32Value(keyOne, fromAscii("123"), { from: accounts[0] }));
  });

  it('sets a address value with correct permission', async () => {
    await storage.putAddressValue(keyOne, accounts[3], { from: accounts[writer] });

    assert.equal(await storage.getAddressValue.call(keyOne), accounts[3]);
  });

  it('should fail to set a address value with incorrect permission', async () => {
    await assertRevert(storage.putAddressValue(keyOne, accounts[3], { from: accounts[0] }));
  });

  it('increments a uint value with correct permission', async () => {
    await storage.putUintValue(keyOne, 5, { from: accounts[writer] });
    await storage.incrementUintValue(keyOne, 2, { from: accounts[writer] });

    assert.equal(await storage.getUintValue.call(keyOne), 7);
  });

  it('should fail to increment a uint value with incorrect permission', async () => {
    await storage.putUintValue(keyOne, 5, { from: accounts[writer] });
    await assertRevert(storage.incrementUintValue(keyOne, 2, { from: accounts[0] }));
  });

  it('decrements a uint value with correct permission', async () => {
    await storage.putUintValue(keyOne, 5, { from: accounts[writer] });
    await storage.decrementUintValue(keyOne, 2, { from: accounts[writer] });

    assert.equal(await storage.getUintValue.call(keyOne), 3);
  });

  it('should fail to decrement a uint value with incorrect permission', async () => {
    await storage.putUintValue(keyOne, 5, { from: accounts[writer] });
    await assertRevert(storage.decrementUintValue(keyOne, 2, { from: accounts[0] }));
  });

  it('returns 2 uint values correctly', async () => {
    await storage.putUintValue(keyOne, 123, { from: accounts[writer] });
    await storage.putUintValue(keyTwo, 456, { from: accounts[writer] });

    var result = await storage.getTwoUintValues.call(keyOne, keyTwo);
    assert.equal(result[0], 123);
    assert.equal(result[1], 456);
  });

  it('returns 3 uint values correctly', async () => {
    await storage.putUintValue(keyOne, 123, { from: accounts[writer] });
    await storage.putUintValue(keyTwo, 456, { from: accounts[writer] });
    await storage.putUintValue(keyThree, 789, { from: accounts[writer] });

    var result = await storage.getThreeUintValues.call(keyOne, keyTwo, keyThree);
    assert.equal(result[0], 123);
    assert.equal(result[1], 456);
    assert.equal(result[2], 789);
  });

  it('returns 4 uint values correctly', async () => {
    await storage.putUintValue(keyOne, 123, { from: accounts[writer] });
    await storage.putUintValue(keyTwo, 456, { from: accounts[writer] });
    await storage.putUintValue(keyThree, 789, { from: accounts[writer] });
    await storage.putUintValue(keyFour, 101, { from: accounts[writer] });

    var result = await storage.getFourUintValues.call(keyOne, keyTwo, keyThree, keyFour);
    assert.equal(result[0], 123);
    assert.equal(result[1], 456);
    assert.equal(result[2], 789);
    assert.equal(result[3], 101);
  });

  it('returns 5 uint values correctly', async () => {
    await storage.putUintValue(keyOne, 123, { from: accounts[writer] });
    await storage.putUintValue(keyTwo, 456, { from: accounts[writer] });
    await storage.putUintValue(keyThree, 789, { from: accounts[writer] });
    await storage.putUintValue(keyFour, 101, { from: accounts[writer] });
    await storage.putUintValue(keyFive, 202, { from: accounts[writer] });

    var result = await storage.getFiveUintValues.call(keyOne, keyTwo, keyThree, keyFour, keyFive);
    assert.equal(result[0], 123);
    assert.equal(result[1], 456);
    assert.equal(result[2], 789);
    assert.equal(result[3], 101);
    assert.equal(result[4], 202);
  });

  it('returns 2 bytes32 values correctly', async () => {
    await storage.putBytes32Value(keyOne, fromAscii("123"), { from: accounts[writer] });
    await storage.putBytes32Value(keyTwo, fromAscii("456"), { from: accounts[writer] });

    var result = await storage.getTwoBytes32Values.call(keyOne, keyTwo);
    assert.equal(toAscii(result[0]), "123");
    assert.equal(toAscii(result[1]), "456");
  });

  it('returns 3 bytes32 values correctly', async () => {
    await storage.putBytes32Value(keyOne, fromAscii("123"), { from: accounts[writer] });
    await storage.putBytes32Value(keyTwo, fromAscii("456"), { from: accounts[writer] });
    await storage.putBytes32Value(keyThree, fromAscii("789"), { from: accounts[writer] });

    var result = await storage.getThreeBytes32Values.call(keyOne, keyTwo, keyThree);
    assert.equal(toAscii(result[0]), "123");
    assert.equal(toAscii(result[1]), "456");
    assert.equal(toAscii(result[2]), "789");
  });

  it('returns 4 bytes32 values correctly', async () => {
    await storage.putBytes32Value(keyOne, fromAscii("123"), { from: accounts[writer] });
    await storage.putBytes32Value(keyTwo, fromAscii("456"), { from: accounts[writer] });
    await storage.putBytes32Value(keyThree, fromAscii("789"), { from: accounts[writer] });
    await storage.putBytes32Value(keyFour, fromAscii("101"), { from: accounts[writer] });

    var result = await storage.getFourBytes32Values.call(keyOne, keyTwo, keyThree, keyFour);
    assert.equal(toAscii(result[0]), "123");
    assert.equal(toAscii(result[1]), "456");
    assert.equal(toAscii(result[2]), "789");
    assert.equal(toAscii(result[3]), "101");
  });

  it('returns 5 bytes32 values correctly', async () => {
    await storage.putBytes32Value(keyOne, fromAscii("123"), { from: accounts[writer] });
    await storage.putBytes32Value(keyTwo, fromAscii("456"), { from: accounts[writer] });
    await storage.putBytes32Value(keyThree, fromAscii("789"), { from: accounts[writer] });
    await storage.putBytes32Value(keyFour, fromAscii("101"), { from: accounts[writer] });
    await storage.putBytes32Value(keyFive, fromAscii("202"), { from: accounts[writer] });

    var result = await storage.getFiveBytes32Values.call(keyOne, keyTwo, keyThree, keyFour, keyFive);
    assert.equal(toAscii(result[0]), "123");
    assert.equal(toAscii(result[1]), "456");
    assert.equal(toAscii(result[2]), "789");
    assert.equal(toAscii(result[3]), "101");
    assert.equal(toAscii(result[4]), "202");
  });
});
