pragma solidity ^0.4.24;

import '../storage/StorageI.sol';

/**
 * @title Kauri Read Operations
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Provides write functions that interact with the external storage contract.
 */
library KauriWriteOperations {

    //If any of these constants are changed, also change in KauriReadOperations and the docs!
    string constant CHECKPOINT_KEY = "checkpoint";
    string constant CHECKPOINTER_ADDRESS_KEY = "checkpointer-address";

    /****************************************
     * Checkpoint write functions
    *****************************************/
    function saveNewCheckpoint(address _storageAddress, bytes32 _checkpointRoot, address _checkpointer) public {
        StorageI storageContract = StorageI(_storageAddress);

        storageContract.putAddressValue(
            keccak256(abi.encodePacked(CHECKPOINT_KEY, _checkpointRoot)), _checkpointer);
    }

    function addCheckpointerAddress(address _storageAddress, address _checkpointerAddress) public {
        StorageI storageContract = StorageI(_storageAddress);

        storageContract.putBooleanValue(
            keccak256(abi.encodePacked(CHECKPOINTER_ADDRESS_KEY, _checkpointerAddress)), true);
    }
}