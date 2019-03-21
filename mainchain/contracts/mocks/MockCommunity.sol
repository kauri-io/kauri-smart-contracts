pragma solidity ^0.4.24;

import '../community/CommunityI.sol';
import '../permissions/Administrable.sol';

contract MockCommunity is CommunityI, Administrable {

    address curator;
    bytes32 communityId;

    function createCommunity(bytes32 _communityId, address[] _admins, address[] _curators, bytes32 _metadataLocator) external {
        curator = _curators[0];
        communityId = _communityId;
        CommunityCreated(_communityId);
    }

    function addAdmin(bytes32 _communityId, address _adminAddress) external {
        //NOT USED
    }

    function addCurator(bytes32 _communityId, address _curatorAddress) external {
        //NOT USED
    }

    function disableAdmin(bytes32 _communityId, address _adminAddress) external {
        //NOT USED
    }

    function disableCurator(bytes32 _communityId, address _curatorAddress) external {
        //NOT USED
    }

    function isCurator(bytes32 _communityId, address _potentialCuratorAddress) public constant returns(bool) {
        return _communityId == communityId && _potentialCuratorAddress == curator;
    }

    function isAdmin(bytes32 _communityId, address _potentialAdminAddress) public constant returns(bool) {
        //NOT USED
    }
    
    event CommunityCreated(bytes32 communityId);
}