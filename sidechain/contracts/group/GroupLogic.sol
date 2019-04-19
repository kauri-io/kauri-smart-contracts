pragma solidity ^0.5.6;

import '../common/UsingExternalStorage.sol';
import './GroupI.sol';

contract GroupLogic is UsingExternalStorage, GroupI
{
    /*
     *  Constants for hashing storage keys
     */
    string  constant GROUP_KEY      = "COMMUNITY";
    string  constant MEMBER_KEY     = "MEMBER";
    string  constant INVITATION_KEY = "INVITATION";

    /*
     *  Role constants; admin is default 1
     */
    uint8   constant admin          = 1;
    uint8[] public   roles;

    /*
     * Enum for Invitation State
     */
   enum InvitationState { Pending, Revoked, Accepted }
   InvitationState InvState;
   InvitationState constant defaultState = InvitationState.Pending;

    uint expirationPeriod           = 3 days;

    /*************************
     *  Constructor
     *************************/

    /*
     *  @dev Sets roles additional to admin (role 1)
     *  @dev Roles are to be defined via documentation
     *
     *  @param _additionalRoles uint8 array of additional roles
     */
    function setAdditionalRoles(
        uint8[] memory _additionalRoles
    )
        public onlyAdmin(4001)
    {
        roles = _additionalRoles;
        for (uint i = 0; i < roles.length; i++)
        {
            require(roles[i] > 1);
            storageContract.putBooleanValue(keccak256(
                abi.encodePacked("ADDITIONAL_ROLES", roles[i])),
                true
            );
        }
    }


    /*
     * @dev Creates a group with sender address and metadata.
     * @dev Sets sender as role[0] as group creator with highest permissions.
     *
     * @dev Reverts if:
     *      - neither params are provided
     *
     * @param _sender msg.sender OR ecrecovered address from meta-tx
     * @param _metadataLocator IPFS hash for locating metadata
     * @param _secretHashes array of secretHashes to be added as members
     * @param _assignedRoles array of roles to be added as members
     */
    function createGroup(
        address _sender,
        bytes32 _metadataLocator,
        bytes32[] memory _secretHashes,
        uint8[] memory _assignedRoles
    )
        internal
        returns (bool)
    {

        // require length of invites to be <= index 9 (10 total invs)
        require(_secretHashes.length <= 9);
        require(_assignedRoles.length <= 9);

        // require each dynamic array to be of same length
        // require(_assignedRoles.length && == _secretHashes.length);

        // moving groupId to external storage (as opposed to contract state var)
        uint256 groupId = storageContract.getUintValue(keccak256(
            abi.encodePacked("groupId"))
        );

        // set group to ENABLED
        storageContract.putBooleanValue(keccak256(
            abi.encodePacked(GROUP_KEY, groupId, "ENABLED")),
            true
        );

        // set groupId as sequence (uint256)
        storageContract.putUintValue(keccak256(
            abi.encodePacked(GROUP_KEY, groupId, "groupStruct", "groupId")),
            groupId
        );

        // set metadataLocator to group "struct"
        storageContract.putBytes32Value(keccak256(
            abi.encodePacked(GROUP_KEY, groupId, "groupStruct", "metadataLocator")),
            _metadataLocator
        );

        // set groupCreator as sender
        storageContract.putAddressValue(keccak256(
            abi.encodePacked(GROUP_KEY, groupId, "groupStruct", "groupCreator")),
            _sender
        );

        // emit GroupCreated event
        emit GroupCreated(groupId, _sender, _metadataLocator);


        // Add creator as ADMIN member
        addMember(groupId, _sender, admin);

        // Add invitations
        if (_secretHashes.length > 0)
        {
            for (uint i = 0; i < _secretHashes.length; i++)
            {
                storeInvitation(_sender, groupId, _assignedRoles[i], _secretHashes[i]);
            }
        }

        // increment groupId
        storageContract.incrementUintValue(keccak256(
            abi.encodePacked("groupId")),
            1
        );

        return true;
    }

    /*
     *  @dev Creates a new member
     *
     *  @param _sender msg.sender OR ecrecovered address from meta-tx
     *  @param _groupId From the sequence public uint256 (group id)
     *  @param _sender  Address of sender who originated group creation
     *  @param _role    Role (permissions level) address to be set to
     *
     *  @returns bool when member successfully added
     */

    function addMember(
        uint256 _groupId,
        address _memberToAdd,
        uint8 _role
    )
        internal
        returns (bool)
    {
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _memberToAdd)),
            _role
        );

        emit MemberAdded(_memberToAdd, _groupId, _role);
    }



    // store invitation
    function storeInvitation(
        address _sender,
        uint256 _groupId,
        uint8   _role,
        bytes32 _secretHash
    )
        internal
        returns (bool)
    {
        // TODO: retrieve _sender, ensure they have admin permissions

        // retrieve enable value from external storage
        bool enabled = storageContract.getBooleanValue(keccak256(
            abi.encodePacked(GROUP_KEY, _groupId, "ENABLED"))
        );

        // require groupId to be enabled
        require(enabled == true, "group is not enabled");

        // recover signer, and set as address
        storageContract.putAddressValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "SIGNER")),
          _sender
        );

        // store secretHash so it can be checked later
        storageContract.putBytes32Value(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "SECRET_HASH")),
            _secretHash
        );

        // set role
        storageContract.putUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "ROLE")),
            _role
        );

        // set expiration date of 3 days
        storageContract.putUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "EXPIRATION_DATE")),
            now + expirationPeriod
        );

        // put invitation into default state of pending
        storageContract.putUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "STATE")),
            uint(defaultState)
        );

        // emit event
        emit InvitationPending(_groupId, _role, _secretHash);

        return true;
    }


    /*
     *  Utility Functions
     */

    function getRole(
        uint256 _groupId,
        address _addr
    )
        public
        view
        returns (uint256)
    {
        return storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _addr))
        );
    }

    function isAdmin(
        uint256 _groupId,
        address _addr
    )
        public
        view
        returns (bool)
    {
        return storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _addr))
        ) == admin;
    }

    function getInvitationState(
        uint256 _groupId,
        bytes32 _secretHash
    )
        public
        view
        returns (uint)
    {
        return storageContract.getUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "STATE"))
        );
    }


}
