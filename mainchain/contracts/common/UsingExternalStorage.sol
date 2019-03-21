pragma solidity ^0.4.24;

import '../storage/StorageI.sol';
import '../permissions/Administrable.sol';

contract UsingExternalStorage is Administrable {
    StorageI storageContract;
    address storageAddress;

    function setStorageContractAddress(address _storageContract) public onlyAdmin(4001) {
        storageContract = StorageI(_storageContract);
        storageAddress = _storageContract;
    }

    function getStorageContractAddress() view public returns(address) {
        return address(storageContract);
    }
}