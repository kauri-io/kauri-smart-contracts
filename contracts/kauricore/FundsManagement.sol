pragma solidity ^0.4.24;

import '../wallet/Fundable.sol';
import '../permissions/Administrable.sol';

/**
 * @title Funds Management
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Provides functions that interface with a Fundable contract
 */
contract FundsManagement is Administrable {

    Fundable private funds;

    function setFundsContractAddress(address _address) external onlyAdmin(6001) {
        funds = Fundable(_address);
    }

    function addAvailableFunds(address _address, uint _amount) internal {
        funds.addAvailableFunds(_address, _amount);
    }

    function deductAvailableFunds(address _address, uint _amount) internal {
        funds.deductAvailableFunds(_address, _amount);
    }

    function getAvailableFunds(address _address) constant internal returns (uint) {
        return funds.getAvailableFunds(_address);
    }

    function moveValueToFundsContract() internal {
        address fundsAddress = address(funds);
        assert(fundsAddress != 0);
        fundsAddress.transfer(msg.value);
    }

    modifier canAffordToSpendAmount(uint amount) {
        if (amount > msg.value) {
            require(msg.value + getAvailableFunds(msg.sender) >= amount);
        }
        _;
    }

    modifier valueNotGreaterThanAmount(uint amount) {
        require(amount >= msg.value);
        _;
    }
}