pragma solidity ^0.5.6;

import "./ContentI.sol";
import "../common/UsingExternalStorage.sol";
import "../group/GroupClient.sol";

/**
 * ContentI defines the contract interface and all methods that can be executed externally (ABI)
 */

contract ContentLogic is ContentI, UsingExternalStorage, GroupClient
{
    string constant SPACE_OWNER_KEY = "SPACE_OWNER";
    string constant SPACE_OWNER_TYPE_KEY = "SPACE_OWNER_TYPE";
    string constant SPACE_REVISION_COUNT_KEY = "SPACE_REVISION_COUNT";

    string constant REVISION_AUTHOR_KEY = "REVISION_AUTHOR";
    string constant REVISION_HASH_KEY = "REVISION_HASH";
    string constant REVISION_PARENT_KEY = "REVISION_PARENT";
    string constant REVISION_STATE_KEY = "REVISION_STATE";
    string constant REVISION_TIMESTAMP_KEY = "REVISION_TIMESTAMP";

    struct Commit
    {
        bytes32 commitHash;
        uint block;
    }

    mapping(address => Commit) revisionCommits;

    ////////////////////////////////////////////////////
    // Events
    ////////////////////////////////////////////////////
    event SpaceCreated(bytes32 _id, bytes32 _owner, OwnerType _ownerType);
    event SpaceTransferred(bytes32 _id, bytes32 _previousOwner, OwnerType _previousOwnerType, bytes32 _newOwner, OwnerType _newOwnerType, address _transferrer);
    event RevisionPending(bytes32 _spaceId, uint _revisionId, bytes32 _hash, uint _parentRevision, address _author, uint _timestamp);
    event RevisionPublished(bytes32 _spaceId, uint _revisionId, bytes32 _hash, uint _parentRevision, address _author, uint _timestamp);
    event RevisionApproved(bytes32 _spaceId, uint _revisionId, bytes32 _hash, uint _parentRevision, address _author, address _approver);
    event RevisionRejected(bytes32 _spaceId, uint _revisionId, bytes32 _hash, uint _parentRevision, address _author, address _rejector);

    ////////////////////////////////////////////////////
    // Public Functions
    ////////////////////////////////////////////////////

    function pushRevisionCommit(
        bytes32 _commitHash
    ) external returns (bool) {
        return doPushRevisionCommit(_commitHash, msg.sender);
    }

    function pushRevision(
        bytes32 _spaceId,
        bytes32 _hash,
        uint _parentRevision
    ) external returns (bool) {
        return pushRevision(_spaceId, _hash, _parentRevision, msg.sender);
    }

    function approveRevision(
        bytes32 _spaceId,
        uint _revisionId, 
        bytes32 _hash
    ) external returns (bool) {
        return approveRevision(_spaceId, _revisionId, _hash, msg.sender);
    }

    function rejectRevision(
        bytes32 _spaceId, 
        uint _revisionId,
        bytes32 _hash
    ) external returns (bool) {
        return rejectRevision(_spaceId, _revisionId, _hash, msg.sender);
    }

    ////////////////////////////////////////////////////
    // Internal Functions
    ////////////////////////////////////////////////////
    function doCreateContentSpace(
        bytes32 _id,
        bytes32 _owner,
        OwnerType _ownerType
    ) internal returns (bool) {

        //Load data
        bytes32 existingOwner = storageContract.getBytes32Value(getSpaceOwnerKey(_id));
        OwnerType existingOwnerType = OwnerType(storageContract.getUintValue(getSpaceOwnerTypeKey(_id)));

        // Validation
        require(_id[0] != 0, "_id cannot be empty");
        validateOwner(_owner, _ownerType);
        require(!isSpaceOwnerSet(existingOwner, existingOwnerType), "Space already exists");

        // Storage
        storageContract.putBytes32Value(getSpaceOwnerKey(_id), _owner);
        storageContract.putUintValue(getSpaceOwnerTypeKey(_id), uint(_ownerType));

        // Events
        emit SpaceCreated(_id, _owner, _ownerType);

        return true;
    }

    function doTransferContentSpaceOwnership(
        bytes32 _spaceId, 
        bytes32 _newOwner, 
        OwnerType _newOwnerType, 
        address _transferrer
    ) internal returns (bool) {

        //Load data
        bytes32 spaceOwner = storageContract.getBytes32Value(getSpaceOwnerKey(_spaceId));
        OwnerType spaceOwnerType = OwnerType(storageContract.getUintValue(getSpaceOwnerTypeKey(_spaceId)));

        // Validation
        require(_spaceId != 0, "_id cannot be empty");
        validateOwner(_newOwner, _newOwnerType);
        require(isSpaceOwnerSet(spaceOwner, spaceOwnerType), "Space doesn't exist");
        require(hasContentWriteAccess(spaceOwner, spaceOwnerType, _transferrer));

        // Storage
        storageContract.putBytes32Value(getSpaceOwnerKey(_spaceId), _newOwner);
        storageContract.putUintValue(getSpaceOwnerTypeKey(_spaceId), uint(_newOwnerType));

        //Events
        emit SpaceTransferred(_spaceId, spaceOwner, spaceOwnerType, _newOwner, _newOwnerType, _transferrer);

        return true;
    }

    function doPushRevisionCommit(
        bytes32 _commitHash,
        address _sender
    ) internal returns (bool) {
        require(_commitHash != 0); 

        revisionCommits[_sender] = Commit(_commitHash, block.number);
    }

    function pushRevision(
        bytes32 _spaceId,
        bytes32 _hash,
        uint _parentRevision,
        address _author    
    ) internal returns (bool) {

        //Load data
        bytes32 spaceOwner = storageContract.getBytes32Value(getSpaceOwnerKey(_spaceId));
        OwnerType spaceOwnerType = OwnerType(storageContract.getUintValue(getSpaceOwnerTypeKey(_spaceId)));
        uint revisionCount = storageContract.getUintValue(getRevisionCountKey(_spaceId));

        // Validation
        require(_spaceId != 0, "_id cannot be empty");
        require(_hash != 0, "_hash cannot be empty");
        require(isSpaceOwnerSet(spaceOwner, spaceOwnerType), "Space doesn't exist");
        require((revisionCount == 0 && _parentRevision == 0)
            || (revisionCount > 0 && _parentRevision > 0 && _parentRevision <= revisionCount), "Invalid revisiont");
        validateRevisionCommit(_spaceId, _hash, _parentRevision, _author);

        // Storage
        uint revisionId = revisionCount + 1;
        RevisionState state = hasContentWriteAccess(
            spaceOwner, spaceOwnerType, _author) ? RevisionState.PUBLISHED : RevisionState.PENDING;

        uint revisionTimestamp = saveRevision(revisionId, _spaceId, _hash, _author, _parentRevision, state);

        // Increase total revision
        storageContract.incrementUintValue(getRevisionCountKey(_spaceId), 1);

        // Events
        if(state == RevisionState.PUBLISHED) {
            emit RevisionPublished(_spaceId, revisionId, _hash, _parentRevision, _author, revisionTimestamp);
        } else {
            emit RevisionPending(_spaceId, revisionId, _hash, _parentRevision, _author, revisionTimestamp);
        }

        return true;
    }

    function approveRevision(
        bytes32 _spaceId, 
        uint _revisionId, 
        bytes32 _hash, 
        address _approver
    ) internal returns (bool) {

        //Load data
        bytes32 spaceOwner = storageContract.getBytes32Value(getSpaceOwnerKey(_spaceId));
        OwnerType spaceOwnerType = OwnerType(storageContract.getUintValue(getSpaceOwnerTypeKey(_spaceId)));
        bytes32 revisionHash = storageContract.getBytes32Value(getRevisionHashKey(_spaceId, _revisionId));
        RevisionState revisionState = RevisionState(storageContract.getUintValue(getRevisionStateKey(_spaceId, _revisionId)));
        uint parentRevision = storageContract.getUintValue(getRevisionParentKey(_spaceId, _revisionId));
        address revisionAuthor = storageContract.getAddressValue(getRevisionAuthorKey(_spaceId, _revisionId));
        uint revisionTimestamp = storageContract.getUintValue(getRevisionTimestampKey(_spaceId, _revisionId));

        // Validation
        validateRevisionStateUpdate(
            _spaceId,
            _revisionId,
            _hash,
            _approver,
            spaceOwner,
            spaceOwnerType,
            revisionHash,
            revisionState
        );

        // Storage
        updateRevisionState(_spaceId, _revisionId, RevisionState.PUBLISHED);

        // Events
        emit RevisionApproved(_spaceId, _revisionId, _hash, parentRevision, revisionAuthor, _approver);
        emit RevisionPublished(_spaceId, _revisionId, _hash, parentRevision, revisionAuthor, revisionTimestamp);

        return true;
    }

    function rejectRevision(
        bytes32 _spaceId, 
        uint _revisionId, 
        bytes32 _hash, 
        address _rejector
    ) internal returns (bool) {

        //Load data
        bytes32 spaceOwner = storageContract.getBytes32Value(getSpaceOwnerKey(_spaceId));
        OwnerType spaceOwnerType = OwnerType(storageContract.getUintValue(getSpaceOwnerTypeKey(_spaceId)));
        bytes32 revisionHash = storageContract.getBytes32Value(getRevisionHashKey(_spaceId, _revisionId));
        RevisionState revisionState = RevisionState(storageContract.getUintValue(getRevisionStateKey(_spaceId, _revisionId)));
        uint parentRevision = storageContract.getUintValue(getRevisionParentKey(_spaceId, _revisionId));
        address revisionAuthor = storageContract.getAddressValue(getRevisionAuthorKey(_spaceId, _revisionId));

        // Validation
        validateRevisionStateUpdate(
            _spaceId,
            _revisionId,
            _hash,
            _rejector,
            spaceOwner,
            spaceOwnerType,
            revisionHash,
            revisionState
        );

        // Storage
        updateRevisionState(_spaceId, _revisionId, RevisionState.REJECTED);

        // Events
        emit RevisionRejected(_spaceId, _revisionId, _hash, parentRevision, revisionAuthor, _rejector);

        return true;
    }

    function validateRevisionStateUpdate(
        bytes32 _spaceId,
        uint _revisionId,
        bytes32 _hash,
        address _actor,
        bytes32 _spaceOwner,
        OwnerType _spaceOwnerType,
        bytes32 _existingRevisionHash,
        RevisionState _existingRevisionState
    ) internal view {
        require(_spaceId != 0, "_spaceId cannot be empty");
        require(_revisionId != 0, "_revisionId cannot be empty");
        require(_hash != 0, "_hash cannot be empty");
        require(isSpaceOwnerSet(_spaceOwner, _spaceOwnerType), "Space doesn't exist");
        require(_existingRevisionHash != 0, "Revision doesn't exist on this space");
        require(_existingRevisionHash == _hash, "Revision hash doesn't match");
        require(_existingRevisionState == RevisionState.PENDING, "Revision isn't pending");
        require(hasContentWriteAccess(_spaceOwner, _spaceOwnerType, _actor), "Only owner can update a revison state");
    }

    function validateOwner(bytes32 _owner, OwnerType _ownerType) internal pure {
        if (_ownerType == OwnerType.ADDRESS) {
            require(_owner != 0, "_owner cannot be 0x");
        }
    }

    function validateRevisionCommit(
        bytes32 _spaceId,
        bytes32 _hash,
        uint _parentRevision,
        address _author) internal view {

        require(keccak256(
            abi.encodePacked(
                _spaceId, 
                _hash, 
                _parentRevision, 
                _author)) == revisionCommits[_author].commitHash, "Commit hash doesn't match");
        
        require(block.number > revisionCommits[_author].block);
    }

    function isSpaceOwnerSet(bytes32 _spaceOwner, OwnerType _spaceOwnerType) internal pure returns (bool) {
        return _spaceOwner != 0 || uint(_spaceOwnerType) > 0;
    }

    function saveRevision(
        uint _revisionId, 
        bytes32 _spaceId, 
        bytes32 _hash,
        address _author, 
        uint _parentRevision,
        RevisionState _state
    ) internal returns (uint) {
        storageContract.putBytes32Value(getRevisionHashKey(_spaceId, _revisionId), _hash);
        storageContract.putAddressValue(getRevisionAuthorKey(_spaceId, _revisionId), _author);
        storageContract.putUintValue(getRevisionParentKey(_spaceId, _revisionId), _parentRevision);
        updateRevisionState(_spaceId, _revisionId, _state);
        storageContract.putUintValue(getRevisionTimestampKey(_spaceId, _revisionId), now);

        return now;
    }

    function updateRevisionState( 
        bytes32 _spaceId, 
        uint _revisionId,
        RevisionState _state
    ) internal {
        storageContract.putUintValue(getRevisionStateKey(_spaceId, _revisionId), uint(_state));
    }

    function hasContentWriteAccess(
        bytes32 _contentOwner,
        OwnerType _ownerType,
        address _addressToCheck
    ) internal view returns (bool) {

        if (_ownerType == OwnerType.ADDRESS) {
            return bytes32ToAddress(_contentOwner) == _addressToCheck;
        } 

        if (_ownerType == OwnerType.GROUP) {
            return isMember(bytes32ToUint(_contentOwner), _addressToCheck);
        } 

        return false;
    }

    ////////////////////////////////////////////////////
    // Conversion Functions
    ////////////////////////////////////////////////////
    function addressToBytes32(address _value) internal pure returns (bytes32) {
        return bytes32(uint256(_value));
    }

    function bytes32ToAddress(bytes32 _value) internal pure returns (address) {
        return address(uint160(uint256(_value)));
    }

    function bytes32ToUint(bytes32 _value) internal pure returns (uint) {
        return uint(_value);
    }

    ////////////////////////////////////////////////////
    // Key Generation Functions
    ////////////////////////////////////////////////////
    function getSpaceOwnerKey(bytes32 _spaceId) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                SPACE_OWNER_KEY,
                _spaceId
            )
        );
    }

    function getSpaceOwnerTypeKey(bytes32 _spaceId) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                SPACE_OWNER_TYPE_KEY,
                _spaceId
            )
        );
    }

    function getRevisionCountKey(bytes32 _spaceId) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                SPACE_REVISION_COUNT_KEY,
                _spaceId
            )
        );
    }

    function getRevisionAuthorKey(
        bytes32 _spaceId, 
        uint _revisionId
    ) internal pure returns (bytes32) {
        return getRevisionKey(REVISION_AUTHOR_KEY, _spaceId, _revisionId);
    }

    function getRevisionHashKey(
        bytes32 _spaceId, 
        uint _revisionId
    ) internal pure returns (bytes32) {
        return getRevisionKey(REVISION_HASH_KEY, _spaceId, _revisionId);
    }

    function getRevisionParentKey(
        bytes32 _spaceId, 
        uint _revisionId
    ) internal pure returns (bytes32) {
        return getRevisionKey(REVISION_PARENT_KEY, _spaceId, _revisionId);
    }

    function getRevisionStateKey(
        bytes32 _spaceId, 
        uint _revisionId
    ) internal pure returns (bytes32) {
        return getRevisionKey(REVISION_STATE_KEY, _spaceId, _revisionId);
    }

    function getRevisionTimestampKey(
        bytes32 _spaceId,
        uint _revisionId
    ) internal pure returns (bytes32) {
        return getRevisionKey(REVISION_TIMESTAMP_KEY, _spaceId, _revisionId);
    }

    function getRevisionKey(
        string memory _valueIdentifier,
        bytes32 _spaceId, 
        uint _revisionId
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                _valueIdentifier,
                _spaceId,
                _revisionId
            )
        );
    }
}