pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import './AdminController.sol';

contract OnlyOwnerAdminController is AdminController, Ownable {

    function canAdminister(uint /*functionCode*/, address caller) public returns(bool) {
        return caller == owner;
    }
}