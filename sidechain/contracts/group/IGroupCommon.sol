pragma solidity ^0.5.6;

interface IGroupCommon
{
    function createGroup(bytes32 _metadataLocator)
        external
        returns (bool);

    event GroupCreated(uint256 indexed groupId, address indexed groupOwner, bytes32 metadataLocator);
    event MemberAdded(address indexed member, uint256 indexed groupId, uint8 indexed role);
}
