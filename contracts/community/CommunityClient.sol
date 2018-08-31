pragma solidity ^0.4.24;

import './CommunityI.sol';

contract CommunityClient {

    CommunityI private communityContract;

    function isCurator(bytes32 _communityId, address _theAddress) internal view returns (bool) {
        return communityContract.isCurator(_communityId, _theAddress);
    }

    function setCommunityContractAddress(address _contractAddress) external {
        communityContract = CommunityI(_contractAddress);
    }
}