pragma solidity ^0.4.24;

import './RequestUpdating.sol';
import './RequestBounties.sol';
import './RequestRefunding.sol';
import './RequestFulfilment.sol';
import './Articles.sol';

/**
 * @title Kauri Core
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev This is the deployable Kauri smart contract.
 */
contract KauriCore is RequestUpdating, RequestBounties, RequestRefunding, RequestFulfilment, Articles {

    function KauriCore(uint64 _maxContributions, 
                       uint64 _publicationTimeout,
                       uint64 _minDeadlineDuration,
                       uint64 _maxDeadlineDuration) 
                       public {
        maxContributions = _maxContributions;
        publicationTimeout = _publicationTimeout;
        minDeadlineDuration = _minDeadlineDuration;
        maxDeadlineDuration = _maxDeadlineDuration;
    }

    function() public payable {
        revert();
    }
}