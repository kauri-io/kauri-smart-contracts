pragma solidity ^0.4.24;

import '../kauricore/KauriBase.sol';
import '../storage/StorageI.sol';

/**
 * @title Kauri Read Operations
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Provides write functions that interact with the external storage contract.
 */
library KauriWriteOperations {

    //If any of these constants are changed, also change in KauriReadOperations and the docs!
    string constant CONTENT_HASH_KEY = "content-hash";
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
     * Request write functions
    *****************************************/

    function saveNewRequest(address _storageAddress, bytes32 _id, bytes32 _community, uint64 _deadline) public {
        StorageI storageContract = StorageI(_storageAddress);
        storageContract.putBytes32Value(keccak256(COMMUNITY_KEY, _id), _community);

        storageContract.putBundleAValues(keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _id),
                                                        msg.sender,
                                                        _deadline,
                                                        uint32(KauriBase.RequestStatus.CREATED));
    }

    function updateRequestStatus(address _storageAddress, bytes32 _requestId, KauriBase.RequestStatus _newStatus) public {
        StorageI(_storageAddress).setBundleAValue3(
            keccak256(REQUEST_CREATOR_DEADLINE_STATUS_KEY, _requestId), uint32(_newStatus));
    }

    function updateRequestContentHash(address _storageAddress, bytes32 _requestId, bytes32 _contentHash) public {
        StorageI(_storageAddress).putBytes32Value(keccak256(CONTENT_HASH_KEY, _requestId), _contentHash);
    }

    function updateRequestFlagged(address _storageAddress, bytes32 _requestId, address _flagger, bool _isFlagged) public {
        StorageI(_storageAddress).putBooleanValue(keccak256(REQUEST_FLAGGED_KEY, _requestId, _flagger), _isFlagged);
    }

    function incrementRequestFlaggedCount(address _storageAddress, bytes32 _requestId) public returns(uint) {
        return StorageI(_storageAddress).incrementUintValue(keccak256(FLAGGED_COUNT_KEY, _requestId), 1);
    }

    function decrementRequestFlaggedCount(address _storageAddress, bytes32 _requestId) public returns(uint) {
        return StorageI(_storageAddress).decrementUintValue(keccak256(FLAGGED_COUNT_KEY, _requestId), 1);
    }

    function clearRequestFlaggedCount(address _storageAddress, bytes32 _requestId) public {
        StorageI(_storageAddress).putUintValue(keccak256(FLAGGED_COUNT_KEY, _requestId), 0);
    }

    /****************************************
     * Request bounty write functions
    *****************************************/
    function addBounty(address _storageAddress, bytes32 _requestId, address _contributorAddress, uint _bountyValue) public returns(uint) {
        StorageI storageContract = StorageI(_storageAddress);
        uint contributionCount = storageContract.incrementUintValue(keccak256(BOUNTY_CONTRIBUTION_COUNT_KEY, _requestId), 1);
        
        uint index = contributionCount - 1;
        //Store address and amount at next index
        storageContract.putAddressValue(
            keccak256(BOUNTY_CONTRIBUTOR_ADDRESS_KEY, _requestId, index), _contributorAddress);    
        storageContract.putUintValue(
            keccak256(BOUNTY_CONTRIBUTOR_AMOUNT_KEY, _requestId, index), _bountyValue);

        //Increment total bounty amount
        return storageContract.incrementUintValue(keccak256(BOUNTY_TOTAL_KEY, _requestId), _bountyValue);
    }

    function clearBounties(address _storageAddress, bytes32 _requestId) public {
        StorageI storageContract = StorageI(_storageAddress);
        uint contributionCount = storageContract.getUintValue(keccak256(BOUNTY_CONTRIBUTION_COUNT_KEY, _requestId));

        for (uint i = 0; i < contributionCount; i++) {
            clearBounty(_storageAddress, _requestId, i);
        }

        clearBountyMetadata(_storageAddress, _requestId);
    }

    function clearBounty(address _storageAddress, bytes32 _requestId, uint bountyIndex) public {
        StorageI storageContract = StorageI(_storageAddress);
        storageContract.putAddressValue(keccak256(BOUNTY_CONTRIBUTOR_ADDRESS_KEY, _requestId, bountyIndex), 0);    
        storageContract.putUintValue(keccak256(BOUNTY_CONTRIBUTOR_AMOUNT_KEY, _requestId, bountyIndex), 0);
    }

    function clearBountyMetadata(address _storageAddress, bytes32 _requestId) public {
        StorageI storageContract = StorageI(_storageAddress);
        storageContract.putUintValue(keccak256(BOUNTY_CONTRIBUTION_COUNT_KEY, _requestId), 0);
        storageContract.putUintValue(keccak256(BOUNTY_TOTAL_KEY, _requestId), 0);
    }

    /****************************************
     * Article write functions
    *****************************************/
    function saveNewArticle(address _storageAddress, 
                            bytes32 _articleId,
                            uint _articleVersion, 
                            bytes32 _requestId, 
                            address _creator) public {
        StorageI storageContract = StorageI(_storageAddress);
        bytes32 articleKey = getArticleKey(_articleId);
        bytes32 articleVersionKey = getArticleVersionKey(_articleId, _articleVersion, _requestId);

        storageContract.putUintValue(
            keccak256(ARTICLE_LATEST_VERSION_KEY, articleKey), _articleVersion);
        storageContract.putAddressValue(
            keccak256(ARTICLE_VERSION_CREATOR_KEY, articleVersionKey), _creator);
    }

    /****************************************
     * Checkpoint write functions
    *****************************************/
    function saveNewCheckpoint(address _storageAddress, bytes32 _checkpointRoot, address _checkpointer) public {
        StorageI storageContract = StorageI(_storageAddress);

        storageContract.putAddressValue(keccak256(CHECKPOINT_KEY, _checkpointRoot), _checkpointer);
    }

    function addCheckpointerAddress(address _storageAddress, address _checkpointerAddress) public {
        StorageI storageContract = StorageI(_storageAddress);

        storageContract.putBooleanValue(keccak256(CHECKPOINTER_ADDRESS_KEY, _checkpointerAddress), true);
    }
}