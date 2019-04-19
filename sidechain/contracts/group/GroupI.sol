pragma solidity ^0.5.6;

/**
 * GroupI defines the contract interface and all methods that can be executed from outside (ABI)
 */
interface GroupI
{

    //////////////////////////////////////////////////////////////////
    // CREATE_GROUP
    //////////////////////////////////////////////////////////////////

    /**
     * [META-TX] prepareCreateGroup
     * View function that generates a unique method call message for `createGroup` in order to be signed and sent to a relayer so we can identify the original sender using ecrecover
     */
    function prepareCreateGroup(
        bytes32 _metadataLocator,
        bytes32[] calldata _secretHashes,
        uint8[] calldata _assignedRoles,
        uint256 _nonce
    )
        external
        view
        returns (bytes32);

    /**
     * [META-TX] createGroup
     * Transaction function to create a group where the transaction sender only acts as a middle-man (meta-tx relayer) and the original sender is recovered from the signature
     */
    function createGroup(
        bytes32 _metadataLocator,
        bytes32[] calldata _secretHashes,
        uint8[] calldata _assignedRoles,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool);

    /**
     * [DIRECT] createGroup
     * Transaction function to create a group where there is no middle-man (transaction sender = original sender)
     */
    function createGroup(
        bytes32 _metadataLocator,
        bytes32[] calldata _secretHashes,
        uint8[] calldata _assignedRoles
    )
        external
        returns (bool);



    //////////////////////////////////////////////////////////////////
    // INVITATION
    //////////////////////////////////////////////////////////////////

    /**
     * [META-TX] prepareInvitation
     * View function that generates a unique method call message for `storeInvitation` in order to be signed and sent to a relayer so we can identify the original sender using ecrecover
     */
    function prepareInvitation(
        uint256 _groupId,
        uint8   _role,
        bytes32 _secretHash,
        uint256 _nonce
    )
        external
        view
        returns (bytes32);

    /**
     * [META-TX] storeInvitation
     * Transaction function to store an invitation where the transaction sender only acts as a middle-man (meta-tx relayer) and the original sender is recovered from the signature
     */
    function storeInvitation(
        uint256 _groupId,
        uint8   _role,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool);

    /**
     * [DIRECT] storeInvitation
     * Transaction function to store an invitation where there is no middle-man (transaction sender = original sender)
     */
    function storeInvitation(
        uint256 _groupId,
        uint8   _role,
        bytes32 _secretHash
    )
        external
        returns (bool);


        

    //////////////////////////////////////////////////////////////////
    // REVOKE INVITATION
    //////////////////////////////////////////////////////////////////

    /**
     * [META-TX] prepareInvitation
     * View function that generates a unique method call message for `prepareRevokeInvitation` in order to be signed and sent to a relayer so we can identify the original sender using ecrecover
     */
    function prepareRevokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        uint256 _nonce
    )
        external
        view
        returns (bytes32);

    /**
     * [META-TX] revokeInvitation
     * Transaction function to store an invitation where the transaction sender only acts as a middle-man (meta-tx relayer) and the original sender is recovered from the signature
     */
    function revokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool);

    /**
     * [DIRECT] revokeInvitation
     * Transaction function to store an invitation where there is no middle-man (transaction sender = original sender)
     */
    function storeInvitation(
        uint256 _groupId,
        bytes32 _secretHash
    )
        external
        returns (bool);


    //////////////////////////////////////////////////////////////////
    // NONCE
    //////////////////////////////////////////////////////////////////

    function getNonce(
        address _sender
    )
        external
        view
        returns (uint256);

    //////////////////////////////////////////////////////////////////
    // EVENTS
    //////////////////////////////////////////////////////////////////

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
