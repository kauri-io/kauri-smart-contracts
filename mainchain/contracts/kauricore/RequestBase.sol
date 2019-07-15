pragma solidity ^0.4.24;

import './BountyBase.sol';
import './FundsManagement.sol';
import './Checkpoint.sol';

/**
 * @title Request Base
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Base operations for requests, including shared modifiers.
 */
contract RequestBase is BountyBase, Checkpoint {

    /**
     * @dev Adds a request with the specified attributes.
     *
     * @dev Reverts if: 
     * @dev     - a request with the specified id already exists (status not null)
     * @dev     - the specified deadline is not within a valid range (min-max)
     * @dev     - the bounty amount is greater than the tx.value plus available funds in wallet.
     * @dev     - the value sent in the transaction is greater than the bounty amount
     *
     * @param _id The id of the new request.
     * @param _contentHash The requests content hash
     * @param _community byte representation of the request community
     * @param _deadline the deadline time in seconds from epoch
     */
    function addRequest(bytes32 _id, 
                        bytes32 _contentHash, 
                        bytes32 _community, 
                        uint64 _deadline, 
                        uint _bountyAmount) 
                        payable 
                        external
                        withValidDeadline(_deadline)
                        canAffordToSpendAmount(_bountyAmount)
                        valueNotGreaterThanAmount(_bountyAmount) {

        RequestStatus requestStatus = KauriReadOperations.getAddRequestContext(storageAddress, _id);

        //Validation Start
        atStatus(requestStatus, RequestStatus.NULL);
        //Validation End

        KauriWriteOperations.saveNewRequest(storageAddress, _id, _community, _deadline);

        RequestCreated(_community, msg.sender, _id, _contentHash);
        
        if (_bountyAmount > 0) {
            doAddBounty(_id, _bountyAmount);
        }
    }

    /**
     * @dev Called by an article writer in order to lock the request from updates.

     * @dev Reverts if: 
     * @dev     - the request is not in a CREATED state
     *
     * @param _id the id of the request that is to be 'flagged'
     */
    function startWorkOnRequest(bytes32 _id) 
            external {
        RequestStatus requestStatus = 
                KauriReadOperations.getStartWorkOnRequestContext(storageAddress, _id);

        //Validation Start
        atStatus(requestStatus, RequestStatus.CREATED);
        //Validation End

        KauriWriteOperations.updateRequestFlagged(storageAddress, _id, msg.sender, true);
        KauriWriteOperations.incrementRequestFlaggedCount(storageAddress, _id);

        RequestFlagged(_id, msg.sender);
    }

    /**
     * @dev Called by an article writer that has decided to no longer work on a request.
     * @dev If this is the only account that has started work on a request, then state reverts to CREATED.
     *
     * @dev Reverts if: 
     * @dev     - the message sender has not previous called the startWorkOnRequest function for this request
     * @dev     - the request is not in a CREATED state
     *
     * @param _id the id of the request in question
     */
    function cancelWorkOnRequest(bytes32 _id)
            external {
        
        RequestStatus requestStatus;
        bool isRequestFlaggedByAccount;
        (requestStatus, isRequestFlaggedByAccount) = 
                KauriReadOperations.getCancelWorkOnRequestContext(storageAddress, _id, msg.sender);

        //Validation Start
        require(isRequestFlaggedByAccount == true);
        atStatus(requestStatus, RequestStatus.CREATED);
        //Validation End

        KauriWriteOperations.updateRequestFlagged(storageAddress, _id, msg.sender, false);
        uint newFlaggedCount = KauriWriteOperations.decrementRequestFlaggedCount(storageAddress, _id);

        RequestUnflagged(_id, msg.sender);

        if (newFlaggedCount == 0) {
            RequestReset(_id);
        }
    }

    /**
     * @dev Retrieves information about a request
     *
     * @param _id the id of the request in question
     *
     * @return (reqContentHash, reqBountyTotal, reqStatusCode, reqCreator, reqFlaggedCount)
     */
    function getRequest(bytes32 _id) 
            view
            external 
            returns (uint bountyTotal, 
                     RequestStatus status, 
                     address requestCreator,
                     uint requestFlaggedCount) {
        return KauriReadOperations.getGetRequestContext(storageAddress, _id);
    }

    function atEitherStatus(RequestStatus _requestStatus, RequestStatus _status, RequestStatus _status2) 
            pure internal {
        require(_requestStatus == _status
            || _requestStatus == _status2);
    }

    function notAtStatus(RequestStatus _requestStatus, RequestStatus _status) 
            pure internal {
        require(_requestStatus != _status);
    }

    function notAtEitherStatus(RequestStatus _requestStatus, RequestStatus _status, RequestStatus _status2) 
            pure internal {
        require(_requestStatus != _status
            && _requestStatus != _status2);
    }

    function notPassedDeadline(uint64 _deadline) view internal {
        require(_deadline > block.timestamp);
    }

    function atStatus(RequestStatus _requestStatus, RequestStatus _requiredStatus) pure internal {
        require(_requestStatus == _requiredStatus);
    }

    function forExistingRequest(RequestStatus _requestStatus) pure internal {
        require(_requestStatus != RequestStatus.NULL);
    }

    modifier withValidDeadline(uint64 deadline) {
        require(deadline >= block.timestamp + minDeadlineDuration && 
                deadline <= block.timestamp + maxDeadlineDuration);
        _;
    }

    event RequestCreated(bytes32 topic, address indexed creator, bytes32 id, bytes32 contentHash);

    event RequestFlagged(bytes32 indexed requestId, address contributorAddress);

    event RequestUnflagged(bytes32 indexed requestId, address contributorAddress);

    event RequestReset(bytes32 indexed requestId);

}