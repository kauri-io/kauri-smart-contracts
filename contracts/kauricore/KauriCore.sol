pragma solidity ^0.4.24;

import './Articles.sol';

/**
 * @title Kauri Core
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev This is the deployable Kauri smart contract.
 */
contract KauriCore is Articles {

    function() public payable {
        revert();
    }
}