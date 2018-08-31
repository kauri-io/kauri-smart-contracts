pragma solidity ^0.4.24;

import './Administrable.sol';

contract Permissioned is Administrable {

    enum AccessType { READ, WRITE }
    mapping(address => AccessType) permissions;

    function addWritePermission(address _writeAddress) external onlyAdmin(2001) {
        permissions[_writeAddress] = AccessType.WRITE;
    }

     modifier hasWriteAccess() {
        require(permissions[msg.sender] == AccessType.WRITE);
        _;
    }
}