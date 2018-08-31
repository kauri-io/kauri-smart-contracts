pragma solidity ^0.4.24;

import '../community/CommunityClient.sol';
import '../common/UsingExternalStorage.sol';
import '../permissions/Administrable.sol';
import './KauriBadge.sol';

contract KauriBadgeController is CommunityClient, UsingExternalStorage {

    bytes constant SIGN_PREFIX = "\x19Ethereum Signed Message:\n32";

    bytes constant COMMUNITY_APPROVAL_PREFIX = "KAURI_COMM_APP";

    mapping (bytes32 => bool) consumedApprovalProofs;
    mapping (address => uint) consumedProofCount;

    KauriBadge kauriBadgeContract;

    function addCommunityApprovalProofs(bytes32[] _communityIds, 
                                        bytes32[] _articleIds, 
                                        uint8[] _vValues,
                                        bytes32[] _rValues,
                                        bytes32[] _sValues)
                                        external {

        address approverAddress;
        for (uint i = 0; i < _communityIds.length; i++) {
            require(consumedApprovalProofs[keccak256(_communityIds[i], _articleIds[i])] == false);

            approverAddress = recoverApproverAddress(
                _communityIds[i], _articleIds[i], msg.sender, _vValues[i], _rValues[i], _sValues[i]);

            require(isCurator(_communityIds[i], approverAddress));

            consumedApprovalProofs[keccak256(_communityIds[i], _articleIds[i])] = true;
            consumedProofCount[msg.sender] = consumedProofCount[msg.sender] + 1;

            if (consumedProofCount[msg.sender] % 5 == 0) {
                //MINT
                mintFiveArticlesApprovedBadge();
            }
        }
    }

    function mintFiveArticlesApprovedBadge() private {
        kauriBadgeContract.mintBadge(msg.sender, 1, 0);
    }

    function recoverApproverAddress(bytes32 _communityId, 
                                     bytes32 _articleId,
                                     address _creator,
                                     uint8 _v, 
                                     bytes32 _r, 
                                     bytes32 _s)
                                     private
                                     pure
                                     returns (address) {
        return ecrecover(keccak256(SIGN_PREFIX, 
            keccak256(COMMUNITY_APPROVAL_PREFIX, _communityId, _articleId, _creator)), _v, _r, _s);
    }

    function setKauriBadgeContractAddress(address _kauriBadgeContractAddress) external onlyAdmin(1101) {
        kauriBadgeContract = KauriBadge(_kauriBadgeContractAddress);
    }
}