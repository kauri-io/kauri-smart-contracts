pragma solidity ^0.4.24;

import '../storage/StorageI.sol';

/**
 * @title Kauri Read Operations
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Provides read functions that interact with the external storage contract.
 */
library KauriReadOperations {

    //If any of these constants are changed, also change in KauriWriteOperations!
    string constant CHECKPOINT_KEY = "checkpoint";
    string constant CHECKPOINTER_ADDRESS_KEY = "checkpointer-address";

    /****************************************
     * Checkpointer read functions
    *****************************************/

    function getIsCheckpointerAddress(address _storageAddress, address _potentialCheckpointer)
            view
            public
            returns(bool) {
        return StorageI(_storageAddress).getBooleanValue(
                keccak256(abi.encodePacked(CHECKPOINTER_ADDRESS_KEY, _potentialCheckpointer)));
    }

    function getCheckpointerAddress(address _storageAddress, bytes32 _checkpointHash)
            view
            public
            returns(address) {
        return StorageI(_storageAddress).getAddressValue(
                keccak256(abi.encodePacked(CHECKPOINT_KEY, _checkpointHash)));
    }
}