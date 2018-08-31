pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import '../wallet/Fundable.sol';
import '../permissions/Permissioned.sol';

/**
 * @title Wallet
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev A deployable smart contract for managing fund withdrawals within the Kauri platform.
 */
contract Wallet is Fundable, Permissioned {
    using SafeMath for uint;
    
    mapping (address => uint) public availableFunds;

    function() public payable {
    }

    /**
     * @dev Assigns funds that can be withdrawn by a specific address.  To be called by KauriCore contract only.
     *
     * @dev Reverts if: 
     * @dev     - called by any contract other than the KauriCore contract.
     *
     * @param _accountAddress the address to which funds should be assigned.
     * @param _amount the amount of ether to assign to the account.
     */
    function addAvailableFunds(address _accountAddress, uint _amount) external hasWriteAccess {
        availableFunds[_accountAddress] = availableFunds[_accountAddress].add(_amount);
    }

    /**
     * @dev Duducts amount from funds that can be withdrawn by a specific address.  To be called by KauriCore contract only.
     *
     * @dev Reverts if: 
     * @dev     - called by any contract other than the KauriCore contract.
     *
     * @param _accountAddress the address to which funds should be deducted.
     * @param _amount the amount of ether to deduct from the account.
     */
    function deductAvailableFunds(address _accountAddress, uint _amount) external hasWriteAccess {
        availableFunds[_accountAddress] = availableFunds[_accountAddress].sub(_amount);
    }

    /**
     * @dev Withdraws all available funds to the msg sender account.
     *
     * @dev Reverts if: 
     * @dev     - the calling account has no funds available to withdraw.
     */
    function withdrawFunds() external hasFunds { 
        uint amount = availableFunds[msg.sender];

        availableFunds[msg.sender] = 0;
        msg.sender.transfer(amount);

        FundsWithdrawn(msg.sender, amount);
    }

    function getAvailableFunds(address _accountAddress) external constant returns (uint) {
        return availableFunds[_accountAddress];
    }

    modifier hasFunds() {
        require(availableFunds[msg.sender] > 0);
        _;
    }

    event FundsWithdrawn(address indexed accountAddress, uint amount);
}