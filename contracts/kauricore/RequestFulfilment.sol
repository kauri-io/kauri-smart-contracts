pragma solidity ^0.4.24;

import './RequestBounties.sol';
import '../community/CommunityClient.sol';

/**
 * @title Request Articles
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions for managing articles within the Kauri platform
 */
contract RequestFulfilment is RequestBounties, CommunityClient {

    /**
     * @dev Fulfils a request in order to receive the associated bounty.

     * @dev Reverts if: 
     * @dev     - a request with the specified id does not exist
     * @dev     - the request is already in an ACCCEPTED state
     * @dev     - the provided signature signer is not a moderator for the request
     *
     * @param _articleId the id of the article that fulfils the request
     * @param _articleVersion the version of the article that fulfils the request
     * @param _requestId the id of the request to be fulfilled
     * @param _contentHash the hash of the article content
     * @param _creatorAddress the creator address
     * @param _timestamp the article timestamp
     * @param _checkpointRoot the checkpoint root containing the article
     * @param _articleProof the proof the article is contained within the checkpoint specified
     * @param _v approval signature recovery id
     * @param _rAndS approval signature r and s values in that order
     */
    function fulfilRequest(bytes32 _requestId,
                            bytes32 _articleId, 
                            uint _articleVersion,
                            string _contentHash,
                            address _creatorAddress,
                            uint _timestamp,
                            bytes32 _checkpointRoot,
                            bytes32[] _articleProof,
                            uint8 _v,
                            bytes32[]_rAndS)
                            public {
        address approverAddress;
        RequestStatus requestStatus;

        validateArticleProof(_articleId, _articleVersion, _contentHash, _creatorAddress, _timestamp, _checkpointRoot, _articleProof);
        (requestStatus, approverAddress) = validateFulfilRequest(
            _requestId, _articleId, _articleVersion, _contentHash, _creatorAddress, _v, _rAndS);

        if (requestStatus == RequestStatus.REFUNDED) {
            KauriWriteOperations.updateRequestStatus(storageAddress, _requestId, RequestStatus.REFUNDED_ACCEPTED);
        } else {
            payoutRequestBounty(_requestId, _articleId, _creatorAddress);
            KauriWriteOperations.updateRequestStatus(storageAddress, _requestId, RequestStatus.ACCEPTED);
        }

        RequestFulfilled(_articleId, _requestId, _creatorAddress, _articleVersion, _contentHash, approverAddress);
    }

    function validateFulfilRequest(bytes32 _requestId,
                                   bytes32 _articleId,
                                   uint _articleVersion,
                                   string _contentHash,
                                   address _creatorAddress,
                                   uint8 _v,
                                   bytes32[] _rAndS)
                                   private
                                   returns (RequestStatus, address) {
        RequestStatus requestStatus;
        address requestCreator;
        bytes32 requestCommunity;

        (requestStatus, requestCreator, requestCommunity) =
                KauriReadOperations.getFulfilRequestContext(storageAddress, _requestId);

        address approverAddress = recoverApproverAddress(_articleId, _articleVersion, _requestId,
            _contentHash, requestCommunity, _creatorAddress, _v, _rAndS);

        forExistingRequest(requestStatus);
        isNotAccepted(requestStatus);
        //Check that the moderator is a moderator for the specified community
        if (requestCommunity == 0) {
            require(requestCreator == approverAddress);
        } else {
            require(isCurator(requestCommunity, approverAddress));
        }

        return (requestStatus, approverAddress);
    }

    function recoverApproverAddress(bytes32 _articleId,
                                     uint _articleVersion,
                                     bytes32 _requestId,
                                     string _contentHash,
                                     bytes32 _community,
                                     address _creatorAddress,
                                     uint8 _v,
                                     bytes32[] _rAndS)
                                     private
                                     pure
                                     returns (address) {
        return ecrecover(keccak256(SIGN_PREFIX, keccak256(
            _articleId, _articleVersion, _requestId, _contentHash, _community, _creatorAddress)), _v, _rAndS[0], _rAndS[1]);
    }

    function isAccepted(RequestStatus status) pure private returns (bool) {
        return status == RequestStatus.ACCEPTED
            || status == RequestStatus.REFUNDED_ACCEPTED;
    }

    function isNotAccepted(RequestStatus status) pure private {
        require(status != RequestStatus.ACCEPTED
            && status != RequestStatus.REFUNDED_ACCEPTED);
    }

    event RequestFulfilled(bytes32 indexed articleId,
                           bytes32 indexed requestId,
                           address indexed creator,
                           uint articleVersion,
                           string contentHash,
                           address moderator);
}