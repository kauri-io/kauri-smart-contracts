pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/MerkleProof.sol';
import './KauriBase.sol';

/**
 * @title Checkpoint
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions for managing article checkpoints within Kauri
 */
contract Checkpoint is KauriBase {

    /**
     * @dev Checkpoint a batch of articles in order to allow proof of ownership on-chain.
     *
     * @dev Reverts if: 
     * @dev     - TODO
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
        address signer = ecrecover(keccak256(abi.encodePacked(SIGN_PREFIX, keccak256(
            abi.encodePacked(_checkpointRoot, _checkpointDocumentLocator)))), _v, _r, _s);
        
        //Validation
        require(KauriReadOperations.getIsCheckpointerAddress(storageAddress, signer));

        KauriWriteOperations.saveNewCheckpoint(storageAddress, _checkpointRoot, signer);

        emit ArticlesCheckpointed(_checkpointRoot, _checkpointDocumentLocator, msg.sender);
    }

    function addCheckpointerAddress(address _checkpointerAddress) external onlyAdmin(11001) {
        KauriWriteOperations.addCheckpointerAddress(storageAddress, _checkpointerAddress);

        emit CheckpointerAddressAdded(_checkpointerAddress);
    }

    function validateArticleProof(bytes32 _articleId,
                                  uint _articleVersion,
                                  string _contentHash,
                                  address _creatorAddress,
                                  uint _timestamp, 
                                  bytes32 _checkpointRoot,
                                  bytes32[] _articleProof)
                                  public
                                  view
                                  isValidCheckpoint(_checkpointRoot) {
        bytes32 articleHash = keccak256(abi.encodePacked(_articleId, _articleVersion, _contentHash, _creatorAddress, _timestamp));

        require(MerkleProof.verifyProof(_articleProof, _checkpointRoot, articleHash));
    }

    modifier isValidCheckpoint(bytes32 _checkpointRoot) {
        address checkpointerAddress = KauriReadOperations.getCheckpointerAddress(storageAddress, _checkpointRoot);

        require(checkpointerAddress != 0);

        _;
    }

    event ArticlesCheckpointed(bytes32 checkpointRoot, string checkpointDocumentLocator, address instigator);
    event CheckpointerAddressAdded(address checkpointerAddress);
}