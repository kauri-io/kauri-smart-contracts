pragma solidity ^0.4.24;

import './CheckpointerI.sol';
import '../permissions/Administrable.sol';

contract CheckpointerClient is Administrable {

    CheckpointerI private checkpointerContract;

    function isArticleProofValid(bytes32 _articleId,
                                  uint _articleVersion,
                                  string _contentHash,
                                  address _creatorAddress,
                                  uint _timestamp, 
                                  bytes32 _checkpointRoot,
                                  bytes32[] _articleProof)
                                  internal
                                  view
                                  returns (bool) {
        return checkpointerContract.validateArticleProof(_articleId, _articleVersion, _contentHash, 
                _creatorAddress, _timestamp, _checkpointRoot, _articleProof);
    }

    function setCheckpointerContractAddress(address _contractAddress) external onlyAdmin(11001) {
        checkpointerContract = CheckpointerI(_contractAddress);
    }
}