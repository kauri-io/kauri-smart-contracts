pragma solidity ^0.4.24;

import './RequestBounties.sol';

/**
 * @title Request Articles
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev Functions for managing articles within the Kauri platform
 */
contract Articles is RequestBase {

    /**
     * @dev Tip the creator of an article some eth.
     *
     * @dev Reverts if:
     * @dev     - the article exists on-chain and the creator address does not match
     *
     * @param _articleId the id of the article to tip
     * @param _articleVersion the current version of the article that is being tipped
     * @param _creatorAddress the address of the article creator that is to be tipped
     * @param _tipAmount the amount of ether to tip
     */
    function tipArticle(bytes32 _articleId,
                        uint _articleVersion,
                        string _contentHash,
                        address _creatorAddress,
                        uint _timestamp,
                        uint _tipAmount,
                        bytes32 _checkpointRoot,
                        bytes32[] _articleProof)
            external
            payable
            tipAmountSet(_tipAmount)
            canAffordToSpendAmount(_tipAmount)
            valueNotGreaterThanAmount(_tipAmount) {

        validateArticleProof(_articleId, _articleVersion, _contentHash, _creatorAddress, _timestamp, _checkpointRoot, _articleProof);

        //Deduct from available funds if required
        if (_tipAmount > msg.value) {
            deductAvailableFunds(msg.sender, _tipAmount - msg.value);
        }

        if (msg.value > 0) {
            moveValueToFundsContract();
        }

        addAvailableFunds(_creatorAddress, _tipAmount);

        ArticleTipped(_articleId, _creatorAddress, _articleVersion, msg.sender, _tipAmount);
    }

    modifier tipAmountSet(uint _tipAmount) {
        require (_tipAmount != 0);
        _;
    }

    event RequestFulfilled(bytes32 indexed articleId,
                           bytes32 indexed requestId,
                           address indexed creator,
                           uint articleVersion,
                           string contentHash,
                           address moderator);

    event ArticleTipped(bytes32 indexed articleId,
                        address indexed creator,
                        uint articleVersion,
                        address tipper,
                        uint tipAmount);
}
