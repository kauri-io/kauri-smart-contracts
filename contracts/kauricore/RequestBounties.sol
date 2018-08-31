pragma solidity ^0.4.24;

import './BountyBase.sol';
import './RequestBase.sol';

/**
 * @title Request Bounties
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions for managing bounties within the Kauri platform.
 */
contract RequestBounties is RequestBase {
    
    /**
     * @dev Adds additional ether to an existing request bounty.
     * @dev Reverts if: 
     *
     * @dev     - the request doesn't exist
     * @dev     - the request is in an ACCEPTED or REFUNDED state
     * @dev     - the max contributions has been exceeded
     * @dev     - the request is in the moderation period
     * @dev     - this function is called without any eth value
     * @dev     - the bounty amount is greater than the tx.value plus available funds in wallet.
     * @dev     - the value sent in the transaction is greater than the bounty amount
     *
     * @param _id The id of the request who's bounty is to be increased.
     */
    function addToBounty(bytes32 _id, 
                         uint _bountyAmount) 
                         external 
                         payable 
                         canAffordToSpendAmount(_bountyAmount)
                         valueNotGreaterThanAmount(_bountyAmount) {
        RequestStatus requestStatus;
        uint64 requestDeadline;
        uint bountyContributionCount;
                
        (requestStatus, requestDeadline, bountyContributionCount) = 
                KauriReadOperations.getAddToBountyContext(storageAddress, _id);

        //Validation Start
        forExistingRequest(requestStatus);
        notAtEitherStatus(requestStatus, RequestStatus.ACCEPTED, RequestStatus.REFUNDED);
        maxContributionsNotExceeded(bountyContributionCount);
        notPassedDeadline(requestDeadline);
        //Validation End

        doAddBounty(_id, _bountyAmount);
    }

    function payoutRequestBounty(bytes32 _requestId, 
                                 bytes32 _articleId,
                                 address _acceptedCreator) 
                                 internal {
        
        uint requestBountyTotal = KauriReadOperations.getRequestBountyTotal(storageAddress, _requestId);
        
        if (requestBountyTotal > 0) {
            addAvailableFunds(_acceptedCreator, requestBountyTotal);
            RequestBountyPaidOut(_requestId, _articleId, _acceptedCreator, requestBountyTotal);
            //Clear some values that are no longer needed to refund gas
            //The bounty values aren't needed after accepting.
            //Bounty info can still be obtained via events
            KauriWriteOperations.clearBounties(storageAddress, _requestId);
        }
        KauriWriteOperations.clearRequestFlaggedCount(storageAddress, _requestId);
    }

    function maxContributionsNotExceeded(uint bountyContributionCount) view private {
        require(bountyContributionCount < maxContributions);
    }

    event RequestBountyPaidOut(bytes32 indexed requestId, 
                               bytes32 indexed articleId, 
                               address indexed acceptedCreator, 
                               uint bountyTotal);
}