const assertRevert = require('./helpers/assertRevert').assertRevert;

const Wallet = artifacts.require("Wallet.sol");
const AdminController = artifacts.require('OnlyOwnerAdminController.sol');

contract('Wallet', function(accounts) {

	const FUNDS_TO_ADD = 1000000000;
  
  it("should be able to add write permissions via the owner account", redeploy(accounts[0], async(wallet) => {
		await wallet.addWritePermission(accounts[1], {from: accounts[0], gas: 3000000});
  }));

	it("should not allow write permissions to be added from non owner account", redeploy(accounts[0], async (wallet) => {
		await assertRevert(wallet.addWritePermission(accounts[1], {from: accounts[2], gas: 3000000}),
				'Contract address incorrectly set from non owner account');
	}));

	it("should add available funds when called from write access account", redeploy(accounts[0], async (wallet) => {
		await addAvailableFunds(wallet);
		let availableFunds  = await wallet.getAvailableFunds.call(accounts[2], {from: accounts[2]});
		assert.equal(availableFunds, FUNDS_TO_ADD);
	}));

	it("should not allow available funds to be to be added from non write access account", redeploy(accounts[0], async (wallet) => {
		await	assertRevert(addAvailableFunds(wallet, accounts[3]),
				'Add funds called from non write access account');
	}));

	it("should deduct available funds when called from write access account", redeploy(accounts[0], async (wallet) => {
		await addAvailableFunds(wallet);
		await deductAvailableFunds(wallet);
		let availableFunds = await wallet.getAvailableFunds.call(accounts[2], {from: accounts[2]});
		assert.equal(availableFunds, FUNDS_TO_ADD / 2);
	}));

	it("should not allow available funds to be to be deducted from non write access account", redeploy(accounts[0], async (wallet) => {
		await addAvailableFunds(wallet)
		await assertRevert(deductAvailableFunds(wallet, accounts[3]),
				'Deduct funds called from non write access account');
	}));

	it("should allow funds to be withdrawn", redeploy(accounts[0], async (wallet) => {
		//Send ether to the wallet fallback so enough funds are available to withdraw
		await sendTransaction(accounts[0], wallet.address, 999999999999999);
			await addAvailableFunds(wallet);
			let fundsBefore = web3.eth.getBalance(accounts[2]);
			let tx = await wallet.withdrawFunds({from: accounts[2], gas: 3000000, gasPrice: 1})
			let fundsAfter = web3.eth.getBalance(accounts[2]);
			let gasUsed = tx.receipt.gasUsed;
			assert.equal(fundsAfter.toString(), fundsBefore.plus(FUNDS_TO_ADD - gasUsed).toString(), "Funds not transferred correctly");
	}));

	it("should zero available funds after withdrawal", redeploy(accounts[0], async (wallet) => {
		//Send ether to the wallet fallback so enough funds are available to withdraw
		await sendTransaction(accounts[0], wallet.address, 999999999999999);
		await addAvailableFunds(wallet);
		await wallet.withdrawFunds({from: accounts[2], gas: 3000000, gasPrice: 1});
		let availableFunds = await wallet.getAvailableFunds.call(accounts[2], {from: accounts[2]});
		assert(availableFunds, 0);
	}));

	it("should throw if withdrawFunds is called when no funds are available", redeploy(accounts[0], async (wallet) => {
		await sendTransaction(accounts[0], wallet.address, 999999999999999);
		await assertRevert(wallet.withdrawFunds({from: accounts[2], gas: 3000000, gasPrice: 1}),
				'An error was expected when calling withdrawFunds without a balance');
	}));

	var addAvailableFunds = async (wallet, fromAccount) => {
		if (!fromAccount) {
			fromAccount = accounts[1];
		}
		await wallet.addWritePermission(accounts[1], {from: accounts[0], gas: 3000000})
		await wallet.addAvailableFunds(accounts[2], FUNDS_TO_ADD, {from: fromAccount, gas: 3000000});
	};

	var deductAvailableFunds = async (wallet, fromAccount) => {
		if (!fromAccount) {
			fromAccount = accounts[1];
		}
		await wallet.addWritePermission(accounts[1], {from: accounts[0], gas: 3000000})
		await wallet.deductAvailableFunds(accounts[2], FUNDS_TO_ADD / 2, {from: fromAccount, gas: 3000000});
	};

	var sendTransaction = (from, to, value) => {
		return new Promise((resolve, reject) => {
			web3.eth.sendTransaction({from: from, to: to, value: value}, (err) => {
				try {
					if (err) {
						reject(err);
					}
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});
	}
});

function redeploy(deployer, testFunction) {
	let wrappedFunction = async () => {
		let adminController = await AdminController.new({ from: deployer });
		let newWallet = await Wallet.new({ from: deployer, gas: 3000000});
		await newWallet.setAdminController(adminController.address, { from: deployer });
		await testFunction(newWallet);
	}
	
	return wrappedFunction;
}