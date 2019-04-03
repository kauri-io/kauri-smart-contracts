pragma solidity ^0.5.6;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import './AdminController.sol';

contract OnlyOwnerAdminController is AdminController, Ownable {

    function canAdminister(uint /*functionCode*/, address caller) public returns(bool) {
        return caller == owner();
    }
}
