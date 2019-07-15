pragma solidity ^0.4.24;

contract AdminController {

    function canAdminister(uint functionCode, address caller) public returns(bool);
}