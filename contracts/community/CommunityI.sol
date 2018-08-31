pragma solidity ^0.4.24;

contract CommunityI {

    function createCommunity(bytes32 _communityId, address[] admins, address[] curators, bytes32 metadataLocator) external;

    function addAdmin(bytes32 _communityId, address _adminAddress) external;

    function addCurator(bytes32 _communityId, address _curatorAddress) external;

    function disableAdmin(bytes32 _communityId, address _adminAddress) external;

    function disableCurator(bytes32 _communityId, address _curatorAddress) external;

    function isCurator(bytes32 _communityId, address _potentialCuratorAddress) public constant returns(bool);

    function isAdmin(bytes32 _communityId, address _potentialAdminAddress) public constant returns(bool);
}