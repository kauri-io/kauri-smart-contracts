pragma solidity ^0.4.24;

import './FundsManagement.sol';
import './KauriBase.sol';

/**
 * @title Bounty Base
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Base operations for bounty actions, including shared modifiers.
 */
contract BountyBase is FundsManagement, KauriBase {

    function doAddBounty(bytes32 _id, uint _bountyAmount) internal {
        //Deduct from available funds if required
        if (_bountyAmount > msg.value) {
            deductAvailableFunds(msg.sender, _bountyAmount - msg.value);
        }

        uint newBountyAmount = KauriWriteOperations.addBounty(storageAddress, _id, msg.sender, _bountyAmount);
        
        moveValueToFundsContract();
        BountyAdded(_id, msg.sender, _bountyAmount, newBountyAmount);
    }

    event BountyAdded(bytes32 indexed requestId, address indexed contributor, uint addedAmount, uint newTotal);
}