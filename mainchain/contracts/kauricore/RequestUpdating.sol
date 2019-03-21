pragma solidity ^0.4.24;

import './RequestBase.sol';

/**
 * @title Request Updating
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions involving the updating of a request
 */
contract RequestUpdating is RequestBase {

    /**
     * @dev Updates the content hash of a request if in a CREATED state.
     *
     * @dev Reverts if: 
     * @dev     - the passed in content hash is empty (0x0)
     * @dev     - the message sender is not the creator of the request
     * @dev     - the request state is not in a CREATED state.
     * @dev     - a user is already working on request
     *
     * @param _id the id of the request that is to be updated
     * @param _newContentHash the updated content hash
     */
    function updateRequest(bytes32 _id, bytes32 _newContentHash) 
            external {
        RequestStatus requestStatus;
        address requestCreator;
        uint64 requestDeadline;
        uint flaggedCount;

        (requestStatus, requestCreator, requestDeadline, flaggedCount) = 
                KauriReadOperations.getUpdateRequestContext(storageAddress, _id);
        //Validation Start
        require(_newContentHash != 0x0);
        require(requestCreator == msg.sender);
        require(flaggedCount == 0);
        atStatus(requestStatus, RequestStatus.CREATED);
        notPassedDeadline(requestDeadline);
        //Validation End

        doRequestUpdate(_id, _newContentHash);
    }

    function doRequestUpdate(bytes32 _requestId, bytes32 _newContentHash) private {
        KauriWriteOperations.updateRequestContentHash(storageAddress, _requestId, _newContentHash);

        RequestUpdated(_requestId, _newContentHash);
    }

    event RequestUpdated(bytes32 indexed id, bytes32 contentHash);
}