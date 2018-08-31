pragma solidity ^0.4.24;

import '../wallet/Fundable.sol';
import '../permissions/Administrable.sol';

contract MockFundable is Fundable, Administrable {
    address[] public addAvailableFundsToAddressArg;
    uint[] public addAvailableFundsAmountArg;
    uint public addAvailableFundsCount;

    address[] public deductAvailableFundsToAddressArg;
    uint[] public deductAvailableFundsAmountArg;
    uint public deductAvailableFundsCount;

    mapping(address => uint) availableFunds;

    function() public payable {
    }

    function addAvailableFunds(address _toAddress, uint _amount) external {
        addAvailableFundsToAddressArg.push(_toAddress);
        addAvailableFundsAmountArg.push(_amount);
        addAvailableFundsCount++;
        AddedAvailableFunds(_toAddress, _amount);
    }

    function deductAvailableFunds(address _toAddress, uint _amount) external {
        deductAvailableFundsToAddressArg.push(_toAddress);
        deductAvailableFundsAmountArg.push(_amount);
        deductAvailableFundsCount++;
    }

    function getAvailableFunds(address _account) external constant returns(uint) {
        return availableFunds[_account];
    }

    function setAvailableFunds(address _account, uint value) external {
        availableFunds[_account] = value;
    }

    uint[] dummy;
    function addWritePermission(address /*_account*/) external {
        //DO NOTHING (Code below is to remove warning)
        dummy.push(1);
    }

    event AddedAvailableFunds(address toAddress, uint _amount);
}