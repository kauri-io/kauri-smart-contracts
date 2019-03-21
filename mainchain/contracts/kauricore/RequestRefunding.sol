pragma solidity ^0.4.24;

import './RequestBase.sol';

/**
 * @title Request Refunding
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions for checking / performing request refunds within the Kauri platform.
 */
contract RequestRefunding is RequestBase {

    /**
     * @dev Refunds a request if eligible.
     * @dev A request can be refunded if:
     * @dev     - the deadline time has been exceeded
     * @dev         AND no articles have been submitted for a request
     * @dev OR  - the deadline time + moderationTimeout has been exceeded
     * @dev         AND at least one article has been submitted for the request.
     *
     * @dev If a request is refunded, the funds available to withdraw is updated for each bounty contributor.
     *
     * @param _requestId The id of the request to check.
     */
    function refundRequest(bytes32 _requestId) external {
        RequestStatus requestStatus;
        address requestCreator;
        uint64 requestDeadline;

        (requestStatus, requestCreator, requestDeadline) = 
                KauriReadOperations.getRefundRequestContext(storageAddress, _requestId);
        uint64 deadline = requestDeadline + publicationTimeout;

        //Start Validation
        atStatus(requestStatus, RequestStatus.CREATED);
        passedDeadline(deadline);
        //End validation

        doRefundRequest(_requestId, requestCreator);
    }

    function doRefundRequest(bytes32 _requestId, address _requestCreator) private {
        KauriWriteOperations.updateRequestStatus(storageAddress, _requestId, RequestStatus.REFUNDED);
        uint contributionCount = KauriReadOperations.getBountyContributionCount(storageAddress, _requestId);
        
        address bountyContributor;
        uint bountyAmount;
        for (uint i = 0; i < contributionCount; i++) {
            (bountyContributor, bountyAmount) = 
                KauriReadOperations.getBountyAtIndex(storageAddress, _requestId, i);
            addAvailableFunds(bountyContributor, bountyAmount);
            KauriWriteOperations.clearBounty(storageAddress, _requestId, i);
        }

        KauriWriteOperations.clearBountyMetadata(storageAddress, _requestId);

        //Clear bounties to refund some gas
        //The bounty values aren't needed after refunding.
        //Bounty info can still be obtained via events
        KauriWriteOperations.clearRequestFlaggedCount(storageAddress, _requestId);

        RequestRefunded(_requestId, _requestCreator);
    }

    function passedDeadline(uint64 deadline) private view {
        require (block.timestamp > deadline);
    }

    event RequestRefunded(bytes32 indexed id, address indexed creator);

}