pragma solidity ^0.4.24;

import '../common/UsingExternalStorage.sol';
import '../checkpoint/CheckpointerClient.sol';
import './StandardBountyIntegration.sol';

contract KauriBounty is StandardBountyIntegration, UsingExternalStorage, CheckpointerClient {

    bytes constant SIGN_PREFIX = "\x19Ethereum Signed Message:\n32";

    string constant APPROVER_COUNT_KEY = "APPROVER_COUNT";

    string constant APPROVER_KEY = "APPROVER";

    //The minimum bounty deadline duration (in seconds)
    uint public minDeadlineDuration;

    //The maximum bounty deadline duration (in seconds)
    uint public maxDeadlineDuration;

    function KauriBounty(uint64 _minDeadlineDuration, uint64 _maxDeadlineDuration) public
    {
        minDeadlineDuration = _minDeadlineDuration;
        maxDeadlineDuration = _maxDeadlineDuration;
    }
    function createBounty(string _contentHash,
                        uint _deadline,
                        address[] approvers) 
                        payable 
                        external
                        withValidDeadline(_deadline)
                        addressArrayNotEmpty(approvers) {

        StandardBounty newBounty = createStandardBounty(_contentHash, _deadline);

        setApprovers(newBounty, approvers);
        
        if (msg.value > 0) { 
            contributeToBounty(address(newBounty), msg.value);
        }

        emit BountyCreated(address(newBounty), _contentHash, _deadline, approvers);
    }

    function fulfilBounty(address _bountyAddress,
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

        require(isArticleProofValid(_articleId, _articleVersion, 
                _contentHash, _creatorAddress, _timestamp, _checkpointRoot, _articleProof));

        (approverAddress) = validateFulfilBounty(
            _bountyAddress, _articleId, _articleVersion, _contentHash, _creatorAddress, _v, _rAndS);

        payoutRequestBounty(_bountyAddress, _contentHash, _creatorAddress);

        emit BountyFulfilled(_articleId, _bountyAddress, _creatorAddress, _articleVersion, _contentHash, approverAddress);
    }

    function recoverApproverAddress(bytes32 _articleId,
                                     uint _articleVersion,
                                     address _bountyAddress,
                                     string _contentHash,
                                     address _creatorAddress,
                                     uint8 _v,
                                     bytes32[] _rAndS)
                                     private
                                     pure
                                     returns (address) {
        return ecrecover(keccak256(SIGN_PREFIX, keccak256(
            _articleId, _articleVersion, _bountyAddress, _contentHash, _creatorAddress)), _v, _rAndS[0], _rAndS[1]);
    }

    function validateFulfilBounty(address _bountyAddress,
                                   bytes32 _articleId,
                                   uint _articleVersion,
                                   string _contentHash,
                                   address _creatorAddress,
                                   uint8 _v,
                                   bytes32[] _rAndS)
                                   private
                                   returns (address) {

        address approverAddress = recoverApproverAddress(_articleId, _articleVersion, _bountyAddress,
            _contentHash, _creatorAddress, _v, _rAndS);

        forExistingBounty(_bountyAddress);
        //Check that the signature signee is a configured approver for the bounty
        onlyApprover(_bountyAddress, approverAddress);
        return (approverAddress);
    }

    function payoutRequestBounty(address _bountyAddress, 
                                 string _articleContentHash,
                                 address _acceptedCreator) 
                                 private {
        
        setApprovers(_bountyAddress, new address[](0));
        fulfillAndAcceptBounty(_bountyAddress, _articleContentHash, _acceptedCreator);
    }

    function setApprovers(address _bountyAddress, address[] approvers) private {
        storageContract.putUintValue(keccak256(abi.encodePacked(APPROVER_COUNT_KEY, _bountyAddress)), approvers.length);

        for (uint i = 0; i < approvers.length; i++) {
            storageContract.putUintValue(keccak256(abi.encodePacked(APPROVER_KEY, _bountyAddress, approvers[i])), 1);
        }
    }

    function getApproverCount(address _bountyAddress) private returns(uint) {
        return storageContract.getUintValue(keccak256(abi.encodePacked(APPROVER_COUNT_KEY, _bountyAddress)));
    }

    function onlyApprover(address _bountyAddress, address _potentialApprover) private view {
        require(storageContract.getUintValue(
            keccak256(abi.encodePacked(APPROVER_KEY, _bountyAddress, _potentialApprover))) == 1);
    }

    function setMinDeadlineDuration(uint64 _minDeadlineDuration) external onlyAdmin(10001) {
        minDeadlineDuration = _minDeadlineDuration;
    }

    function setMaxDeadlineDuration(uint64 _maxDeadlineDuration) external onlyAdmin(10002) {
        maxDeadlineDuration = _maxDeadlineDuration;
    }

    function forExistingBounty(address _bountyAddress) private view {
        require(getApproverCount(_bountyAddress) > 0);
    }

    modifier addressArrayNotEmpty(address[] addressArray) {
        require(addressArray.length > 0);
        _;
    }

    modifier withValidDeadline(uint deadline) {
        require(deadline >= block.timestamp + minDeadlineDuration && 
                deadline <= block.timestamp + maxDeadlineDuration);
        _;
    }

    event BountyCreated(address bountyAddress, string contentHash, uint deadline, address[] approvers);

    event BountyFulfilled(bytes32 indexed articleId,
                           address indexed bountyAddress,
                           address indexed creator,
                           uint articleVersion,
                           string contentHash,
                           address moderator);
} 