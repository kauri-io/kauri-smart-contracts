pragma solidity ^0.5.6;

interface IGroupMetaTx
{
    function prepareCreateGroup(bytes32 _metadataLocator, uint256 _nonce) 
        external 
        view 
        returns (bytes32);

    function createGroup(bytes32 _metadataLocator, bytes calldata _signature, uint256 _nonce) 
        external 
        returns (bool);

    event GroupCreated(uint256 indexed groupId, address indexed groupOwner, bytes32 metadataLocator);
    event MemberAdded(address indexed member, uint256 indexed groupId, uint8 indexed role);
}
