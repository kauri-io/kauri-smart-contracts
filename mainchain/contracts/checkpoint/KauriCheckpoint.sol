pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/MerkleProof.sol';
import '../common/UsingExternalStorage.sol';

/**
 * @title Checkpoint
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions for managing article checkpoints within Kauri
 */
contract KauriCheckpoint is UsingExternalStorage {

    bytes constant SIGN_PREFIX = "\x19Ethereum Signed Message:\n32";

    string constant CHECKPOINT_KEY = "checkpoint";
    string constant CHECKPOINTER_ADDRESS_KEY = "checkpointer-address";

    function() public payable {
        revert();
    }

    /**
     * @dev Checkpoint a batch of articles in order to allow proof of ownership on-chain.
     *
     * @param _checkpointRoot the merkle root of the set of articles included within this checkpoint
     * @param _checkpointDocumentLocator The locator of the checkpoint document
     */
    function checkpointArticles(bytes32 _checkpointRoot,
                                string _checkpointDocumentLocator, 
                                uint8 _v, 
                                bytes32 _r, 
                                bytes32 _s) 
                                external {
        address signer = ecrecover(keccak256(SIGN_PREFIX, keccak256(
            _checkpointRoot, _checkpointDocumentLocator)), _v, _r, _s);
        
        //Validation
        require(getIsCheckpointerAddress(signer));

        saveNewCheckpoint(_checkpointRoot, signer);

        ArticlesCheckpointed(_checkpointRoot, _checkpointDocumentLocator, msg.sender);
    }

    function addCheckpointerAddress(address _checkpointerAddress) external onlyAdmin(11001) {
        saveCheckpointerAddress(_checkpointerAddress);

        CheckpointerAddressAdded(_checkpointerAddress);
    }

    function validateArticleProof(bytes32 _articleId,
                                  uint _articleVersion,
                                  string _contentHash,
                                  address _creatorAddress,
                                  uint _timestamp, 
                                  bytes32 _checkpointRoot,
                                  bytes32[] _articleProof)
                                  public
                                  isValidCheckpoint(_checkpointRoot) {
        bytes32 articleHash = keccak256(_articleId, _articleVersion, _contentHash, _creatorAddress, _timestamp);

        require(MerkleProof.verifyProof(_articleProof, _checkpointRoot, articleHash));
    }

    /****************************************
     * Checkpointer read functions
    *****************************************/

    function getIsCheckpointerAddress(address _potentialCheckpointer)
            view
            public
            returns(bool) {
        return storageContract.getBooleanValue(keccak256(CHECKPOINTER_ADDRESS_KEY, _potentialCheckpointer));
    }

    function getCheckpointerAddress(bytes32 _checkpointHash)
            view
            public
            returns(address) {
        return storageContract.getAddressValue(keccak256(CHECKPOINT_KEY, _checkpointHash));
    }

    /****************************************
     * Checkpoint write functions
    *****************************************/
    function saveNewCheckpoint(bytes32 _checkpointRoot, address _checkpointer) private {

        storageContract.putAddressValue(keccak256(CHECKPOINT_KEY, _checkpointRoot), _checkpointer);
    }

    function saveCheckpointerAddress(address _checkpointerAddress) private {

        storageContract.putBooleanValue(keccak256(CHECKPOINTER_ADDRESS_KEY, _checkpointerAddress), true);
    }

    /****************************************
     * Modifiers
    *****************************************/
    modifier isValidCheckpoint(bytes32 _checkpointRoot) {
        address checkpointerAddress = getCheckpointerAddress(_checkpointRoot);

        require(checkpointerAddress != 0);

        _;
    }

    /****************************************
     * Events
    *****************************************/
    event ArticlesCheckpointed(bytes32 checkpointRoot, string checkpointDocumentLocator, address instigator);
    event CheckpointerAddressAdded(address checkpointerAddress);
}