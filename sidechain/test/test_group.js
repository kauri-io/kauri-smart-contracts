const Group = artifacts.require("Group");

contract("Group", accounts => {
    it("checks that there isn't an existing group", () => 
        Group.deployed()
            .then(instance => instance.groups.call(0))
            .then(thegroup => {
                assert.equal(
                    thegroup.valueOf(),
                    0,
                    "0 asldfkjasdlkfjads"
            );
    }));

    it("creates an initial group", () => {
        const account_one = accounts[0];

        const metadataLocator = web3.utils.toHex('1337');
        const nonce = 0;

        let groups;
        let msghash;
        let sig;
        let mygroup;

        return Group.deployed()
            .then(instance => {
                msghash = instance;
                return groups.prepareCreateGroup()
            })
            .then(signature => {
                sig = signature;
                return web3.eth.sign(accounts[0], msghash);
            })
            .then(newgroup => {
                return groups.createGroup(metadataLocator, sig, nonce);
                assert.equal(
                    account_one,
                    instance.groups.call
                );

    });
})
