pragma solidity ^0.4.24;

import '../common/UsingExternalStorage.sol';
import '../dataaccess/KauriReadOperations.sol';
import '../dataaccess/KauriWriteOperations.sol';
import './KauriConfig.sol';

/**
 * @title Kauri Base
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Structs, enums and modifiers that are used throughout the Kauri smart contracts
 */
contract KauriBase is UsingExternalStorage, KauriConfig {

    bytes constant SIGN_PREFIX = "\x19Ethereum Signed Message:\n32";

    enum RequestStatus { NULL, CREATED, ACCEPTED, REFUNDED, REFUNDED_ACCEPTED }

    modifier hasValue() {
        require(msg.value > 0);
        _;
    }
}