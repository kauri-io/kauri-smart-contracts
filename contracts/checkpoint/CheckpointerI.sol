pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/MerkleProof.sol';

/**
 * @title Checkpoint
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions for managing article checkpoints within Kauri
 */
contract CheckpointerI {

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
                                external;

    function validateArticleProof(bytes32 _articleId,
                                  uint _articleVersion,
                                  string _contentHash,
                                  address _creatorAddress,
                                  uint _timestamp, 
                                  bytes32 _checkpointRoot,
                                  bytes32[] _articleProof)
                                  public
                                  returns (bool);
}