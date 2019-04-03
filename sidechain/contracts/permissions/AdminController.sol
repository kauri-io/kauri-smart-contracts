pragma solidity ^0.5.6;

contract AdminController {

    function canAdminister(uint functionCode, address caller) public returns(bool);

}
