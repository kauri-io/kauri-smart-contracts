pragma solidity ^0.4.24;

import '../storage/StorageI.sol';
import '../kauricore/KauriBase.sol';

/**
 * @title Kauri Read Operations
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Provides read functions that interact with the external storage contract.
 */
library KauriReadOperations {

    //If any of these constants are changed, also change in KauriWriteOperations!
    string constant COMMUNITY_KEY = "community";
    string constant FLAGGED_COUNT_KEY = "flagged-count";
    string constant REQUEST_FLAGGED_KEY = "request-flagged";
    string constant REQUEST_CREATOR_DEADLINE_STATUS_KEY = "request-creator-deadline-status";
    string constant BOUNTY_TOTAL_KEY = "bounty-total";
    string constant BOUNTY_CONTRIBUTION_COUNT_KEY = "bounty-contribution-count";
    string constant BOUNTY_CONTRIBUTOR_ADDRESS_KEY = "bounty-contributor-address";
    string constant BOUNTY_CONTRIBUTOR_AMOUNT_KEY = "bounty-contributor-amount";

    string constant ARTICLE_LATEST_VERSION_KEY = "article-latest-version";
    string constant ARTICLE_VERSION_CREATOR_KEY = "article-version-creator";

    string constant CHECKPOINT_KEY = "checkpoint";
    string constant CHECKPOINTER_ADDRESS_KEY = "checkpointer-address";

    function getArticleVersionKey(bytes32 _articleId, uint _version, bytes32 _requestId) 
            pure
            private 
            returns(bytes32) {
        return keccak256(_articleId, _version, _requestId);
    }

    function getArticleKey(bytes32 _articleId) 
            pure
            private 
            returns(bytes32) {
        return keccak256(_articleId);
    }

    /****************************************
     * RequestArticles.sol context functions
    *****************************************/

    /**
     * @dev Collates values that are required within the submitArticle function.
     *
     * @param _requestId the request id
     *
     * @return the function context (reqStatus, reqDeadline, reqCreator)
     */
    function getFulfilRequestContext(address _storageAddress, 
                                      bytes32 _requestId) 
            view
            public 
            returns(KauriBase.RequestStatus _requestStatus,
                    address _requestCreator,
                    bytes32 _requestCommunity) {
        uint32 requestStatusCode;
        (_requestCreator , , requestStatusCode) = 
                StorageI(_storageAddress).getBundleAValues(keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _requestId));
        _requestStatus = requestStatusCodeToStatus(requestStatusCode);
        _requestCommunity = StorageI(_storageAddress).getBytes32Value(keccak256(COMMUNITY_KEY, _requestId));
    }

    /**
     * @dev Collates values that are required within the tipArticle function.
     *
     * @param _articleId the article id
     * @param _articleVersion the article version
     * @param _requestId the request id
     *
     * @return the function context (baseArticleCreator)
     */
    function getTipArticleContext(address _storageAddress, bytes32 _articleId, uint _articleVersion, bytes32 _requestId) 
            view
            public 
            returns(address baseArticleCreator) {
        
        bytes32 articleVersionKey = getArticleVersionKey(_articleId, _articleVersion, _requestId);

        return StorageI(_storageAddress).getAddressValue(keccak256(ARTICLE_VERSION_CREATOR_KEY, articleVersionKey));
    }

    /****************************************
     * RequestBounties.sol context functions
    *****************************************/

    /**
     * @dev Collates values that are required within the addToBounty function.
     *
     * @param _requestId the request id
     *
     * @return the function context (reqStatus, reqDeadline, bountyContributionsCount)
     */
    function getAddToBountyContext(address _storageAddress, bytes32 _requestId) 
            view
            public 
            returns(KauriBase.RequestStatus _requestStatus,
                    uint64 _requestDeadline,
                    uint _bountyContributionsCount) {

        uint32 requestStatusCode;
        ( , _requestDeadline, requestStatusCode) = 
                StorageI(_storageAddress).getBundleAValues(keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _requestId));
        _requestStatus = requestStatusCodeToStatus(requestStatusCode);

        (_bountyContributionsCount) = 
                StorageI(_storageAddress).getUintValue(keccak256(BOUNTY_CONTRIBUTION_COUNT_KEY, _requestId));
    }

    /****************************************
     * RequestUpdating.sol context functions
    *****************************************/

    /**
     * @dev Collates values that are required within the updateRequest function.
     *
     * @param _requestId the request id
     *
     * @return the function context (reqStatus, reqCreator, reqDeadline, flaggedCount)
     */
    function getUpdateRequestContext(address _storageAddress, bytes32 _requestId)
            view
            public
            returns (KauriBase.RequestStatus _requestStatus,
                     address _requestCreator,
                     uint64 _requestDeadline,
                     uint _flaggedCount) {
        uint32 requestStatusCode;
        (_requestCreator, _requestDeadline, requestStatusCode) = 
                StorageI(_storageAddress).getBundleAValues(keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _requestId));
        _requestStatus = requestStatusCodeToStatus(requestStatusCode);

        _flaggedCount = StorageI(_storageAddress).getUintValue(keccak256(FLAGGED_COUNT_KEY, _requestId));
    }

    /****************************************
     * RequestRefunding.sol context functions
    *****************************************/

    /**
     * @dev Collates values that are required within the refundRequestContext function.
     *
     * @param _requestId the request id
     *
     * @return the function context (reqStatus, reqCreator, reqDeadline)
     */
    function getRefundRequestContext(address _storageAddress, bytes32 _requestId)
            view
            public
            returns (KauriBase.RequestStatus _requestStatus,
                     address _requestCreator,
                     uint64 _requestDeadline) {
        uint32 requestStatusCode;
        (_requestCreator, _requestDeadline, requestStatusCode) = 
                StorageI(_storageAddress).getBundleAValues(keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _requestId));
        _requestStatus = requestStatusCodeToStatus(requestStatusCode);
    }

    /****************************************
     * RequestBase.col context functions
    *****************************************/

    /**
     * @dev Collates values that are required within the addRequest function.
     *
     * @param _requestId the request id
     *
     * @return the function context (reqStatus)
     */
    function getAddRequestContext(address _storageAddress, bytes32 _requestId) 
            view
            public 
            returns(KauriBase.RequestStatus _requestStatus) {
        (_requestStatus, ) = getRequestStatusAndDeadline(_storageAddress, _requestId);
    }

    /**
     * @dev Collates values that are required within the startWorkOnRequest function.
     *
     * @param _requestId the request id
     *
     * @return the function context (reqStatus)
     */
    function getStartWorkOnRequestContext(address _storageAddress, bytes32 _requestId) 
            view
            public 
            returns(KauriBase.RequestStatus _requestStatus) {
        (_requestStatus, ) = getRequestStatusAndDeadline(_storageAddress, _requestId);
    }

    /**
     * @dev Collates values that are required within the cancelWorkOnRequest function.
     *
     * @param _requestId the request id
     * @param _contributor the article creator
     *
     * @return the function context (reqStatus, isReqProvider)
     */
    function getCancelWorkOnRequestContext(address _storageAddress, bytes32 _requestId, address _contributor) 
            view
            public 
            returns(KauriBase.RequestStatus _requestStatus, 
                    bool _isReqProvider) {
        (_requestStatus, ) = getRequestStatusAndDeadline(_storageAddress, _requestId);
        _isReqProvider = StorageI(_storageAddress).getBooleanValue(keccak256(REQUEST_FLAGGED_KEY, _requestId, _contributor));
    }

    /**
     * @dev Collates values that are required within the getRequest function.
     *
     * @param _requestId the request id
     *
     * @return the function context (reqBountyTotal, reqStatus, reqCreator, reqFlaggedCount)
     */
    function getGetRequestContext(address _storageAddress, bytes32 _requestId) 
            view
            public 
            returns (uint _requestBountyTotal,
                     KauriBase.RequestStatus _requestStatus,
                     address _requestCreator,
                     uint _requestFlaggedCount) {
        uint32 requestStatusCode;
        //Should only be 'called' so no need to optimise gas by minimising calls to storage
        (_requestCreator, , requestStatusCode) = 
                StorageI(_storageAddress).getBundleAValues(keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _requestId));

        return (StorageI(_storageAddress).getUintValue(keccak256(BOUNTY_TOTAL_KEY, _requestId)),
                requestStatusCodeToStatus(requestStatusCode),
                _requestCreator,
                StorageI(_storageAddress).getUintValue(keccak256(FLAGGED_COUNT_KEY, _requestId)));
    }

    /****************************************
     * Checkpointer read functions
    *****************************************/

    function getIsCheckpointerAddress(address _storageAddress, address _potentialCheckpointer)
            view
            public
            returns(bool) {
        return StorageI(_storageAddress).getBooleanValue(keccak256(CHECKPOINTER_ADDRESS_KEY, _potentialCheckpointer));
    }

    function getCheckpointerAddress(address _storageAddress, bytes32 _checkpointHash)
            view
            public
            returns(address) {
        return StorageI(_storageAddress).getAddressValue(keccak256(CHECKPOINT_KEY, _checkpointHash));
    }

    /****************************************
     * Helper context functions
    *****************************************/

    function getRequestStatusAndDeadline(address _storageAddress, bytes32 _requestId)
            view
            private
            returns(KauriBase.RequestStatus _requestStatus,
                    uint64 _requestDeadline) {
        uint32 requestStatusCode;
        ( , _requestDeadline, requestStatusCode) = 
                StorageI(_storageAddress).getBundleAValues(keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _requestId));
        _requestStatus = KauriBase.RequestStatus(requestStatusCode);
    }

    /****************************************
     * Additional request read functions
    *****************************************/

    function getBountyAtIndex(address _storageAddress, bytes32 _requestId, uint _index) 
            view
            public 
            returns(address contributorAddress, uint bountyValue) {

        address contributor = StorageI(_storageAddress).getAddressValue(
            keccak256(BOUNTY_CONTRIBUTOR_ADDRESS_KEY, _requestId, _index));    
        uint value = StorageI(_storageAddress).getUintValue(
            keccak256(BOUNTY_CONTRIBUTOR_AMOUNT_KEY, _requestId, _index));
        
        return (contributor, value);
    }

    function getBountyContributionCount(address _storageAddress, bytes32 _requestId)
            view
            public
            returns (uint) {
        return StorageI(_storageAddress).getUintValue(keccak256(BOUNTY_CONTRIBUTION_COUNT_KEY, _requestId));
    }

    function getRequestBountyTotal(address _storageAddress, bytes32 _requestId)
            view
            public
            returns (uint) {
        return StorageI(_storageAddress).getUintValue(keccak256(BOUNTY_TOTAL_KEY, _requestId));
    }

    function requestStatusCodeToStatus(uint32 requestStatusCode) 
                private 
                pure 
                returns (KauriBase.RequestStatus) {
        return KauriBase.RequestStatus(requestStatusCode);
    }
}