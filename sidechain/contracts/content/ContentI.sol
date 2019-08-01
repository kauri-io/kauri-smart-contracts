pragma solidity ^0.5.6;

/**
 * ContentI defines the contract interface and all methods that can be executed externally (ABI)
 */

interface ContentI
{

    ////////////////////////////////////////////////////
    // ENUM
    //
    ////////////////////////////////////////////////////
    enum RevisionState { PENDING, REJECTED, PUBLISHED }
    enum OwnerType { ADDRESS, GROUP }

    ////////////////////////////////////////////////////
    // FUNCTIONS
    //
    ////////////////////////////////////////////////////
    function createContentSpace(
        bytes32 _spaceId
    ) external returns (bool);

    function createContentSpace(
        bytes32 _spaceId,
        bytes32 _owner,
        OwnerType _ownerType
    ) external returns (bool);

    function transferContentSpaceOwnership(
        bytes32 _spaceId,
        bytes32 _newOwner,
        OwnerType _newOwnerType
    ) external returns (bool);

    function pushRevision(
        bytes32 _spaceId,
        bytes32 _hash,
        uint _parentRevision
    ) external returns (bool);

    function approveRevision(
        bytes32 _spaceId,
        uint _revisionId, 
        bytes32 _hash
    ) external returns (bool);

    function rejectRevision(
        bytes32 _spaceId, 
        uint _revisionId,
        bytes32 _hash
    ) external returns (bool);
}