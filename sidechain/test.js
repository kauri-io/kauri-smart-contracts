'use strict';
(async () => {

    let Group = artifacts.require('Group.sol');
    let groupInstance;

    contract('Group', function(accounts) {
        beforeEach(async () => {
            groupInstance = await Group.new();
        })


        /********************
         * Happy Path
         ********************/
        it('should create a group', async () => {
            const account_one = accounts[0];
            const account_two = accounts[0];
            const abc = 0;

            const metadataLocator = web3.utils.toHex('1337');
            const nonce = 0;

            assert.equal(0, 0);
        })
    })
})

//async function createGroup(metadataLocator, sig, nonce) {
//    await groupInstance.createGroup(web3.utils.toHex(metadataLocator, sig, nonce))
//}
