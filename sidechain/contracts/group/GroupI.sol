pragma solidity ^0.5.6;

interface GroupI
{
    function prepareCreateGroup(
        bytes32 _metadataLocator, 
        uint256 _nonce
    ) 
        external 
        view 
        returns (bytes32);

    function createGroup(
        bytes32 _metadataLocator, 
        bytes calldata _signature, 
        uint256 _nonce
    ) 
        external 
        returns (bool);

    function createGroup(
        bytes32 _metadataLocator
    )
        external
        returns (bool);

    function prepareInvitation(
        uint256 _groupId, 
        uint8 _role, 
        bytes32 _secretHash, 
        uint256 _nonce
    )
        external
        pure 
        returns (bytes32);

    function storeInvitation(
        uint256 _groupId,
        uint8   _role,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool);

    function prepareRevokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        uint256 _nonce   
    )
        external
        pure
        returns (bytes32);

    function revokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint256 _nonce   
    )
        external
        returns (bool);

    function prepareAcceptInvitationCommit(
        uint256 _groupId,
        bytes32 _addressSecretHash,
        uint256 _nonce
    )
        external
        pure 
        returns (bytes32);

    function acceptInvitationCommit(
        uint256 _groupId, 
        bytes32 _addressSecretHash, 
        bytes calldata _signature, 
        uint256 _nonce
    )
        external
        returns (bool);

    function acceptInvitation(
        uint256 _groupId,
        bytes32 _secret,
        address _sender
    )
        external
        returns (bool);

    function prepareRemoveMember(
        uint256 _groupId,
        address _accountToRemove,
        uint256 _nonce
    )
        external
        view
        returns (bytes32);

    function removeMember(
        uint256 _groupId,
        address _acountToRemove,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool);

    // meta-tx prepare function
    function prepareChangeMemberRole(
        uint256 _groupId,
        address _accountToChange,
        uint8   _role,
        uint256 _nonce
    )
        external
        returns (bytes32);

    function changeMemberRole(
        uint256 _groupId,
        address _accountToChange,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint8   _role,
        uint256 _nonce
    )
        external
        returns (bool);

    // group events
    event GroupCreated(
        uint256 indexed groupId, address indexed groupOwner, bytes32 metadataLocator);

    // member events
    event MemberAdded(
        address indexed member, uint256 indexed groupId, uint8 indexed role);
    event MemberRemoved(
        uint256 indexed groupId, address indexed member, uint8 indexed role);
    event MemberRoleChanged(
        uint256 indexed groupId, address indexed member, uint8 indexed newRole, uint8 oldRole);

    // invitation events
    event InvitationPending(
        uint256 indexed groupId, uint8 indexed role, bytes32 secretHash);
    event InvitationRevoked(
        uint256 indexed groupId, uint8 indexed role, bytes32 secretHash);
    event AcceptCommitted(
        uint256 indexed groupId, bytes32 indexed addressSecretHash);

}
