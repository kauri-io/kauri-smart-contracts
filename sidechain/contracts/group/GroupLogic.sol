pragma solidity ^0.5.6;

import '../common/UsingExternalStorage.sol';
import './GroupI.sol';

contract GroupLogic is UsingExternalStorage, GroupI
{
    // Constants for hashing storage keys
    string  constant GROUP_KEY      = "COMMUNITY";
    string  constant MEMBER_KEY     = "MEMBER";
    string  constant INVITATION_KEY = "INVITATION";

    // Role constants; admin is default 1
    uint8   constant admin          = 1;
    uint8[] public   roles;
    // TODO: in future, devise way for user to change expiration period
    uint expirationPeriod           = 3 days;

    // Nonce mapping and sequence (groupId)
    mapping(address => bytes32) public temporaryInvitation;

    struct Commit
    {
        uint256 id;
        bytes32 commit;
        bytes   sig;
        uint64  block;
        bool    revealed;
    }

    // Ephemeral mapping for commit/reveal scheme for accepting invite
    mapping(address => Commit) public commits;

    // Enum for Invitation State
    enum InvitationState { Pending, Revoked, Accepted }
    InvitationState InvState;
    InvitationState constant defaultState = InvitationState.Pending;

    /**
     *  addRoles
     *  @dev Sets roles additional to admin (role 1)
     *  @dev Roles are to be defined via documentation
     *  @param _additionalRoles uint8 array of additional roles
     */

    function addRoles(
        uint8[] memory _additionalRoles
    )
        public onlyAdmin(4001)
    {
        roles = _additionalRoles;
        roles.push(1); // add admin role by default

        for (uint i = 0; i < roles.length; i++)
        {
            storageContract.putBooleanValue(
                keccak256(
                    abi.encodePacked(
                        "ADDITIONAL_ROLES",
                        roles[i]
                    )
                ),
                true
            );
        }
    }

    /**
     *  createGroup
     *  @dev creates a group with sender as group creator and with highest permissions
     *  @dev Reverts if neither params are provided
     *  @dev Reverts if more than 10 invitations are attached
     *  @param _sender msg.sender OR ecrecovered address from meta-tx
     *  @param _metadataLocator IPFS hash for locating metadata
     *  @param _secretHashes array of secretHashes to be added as members
     *  @param _assignedRoles array of roles to be added as members
     *  @return bool upon successful tx
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
        require(_secretHashes.length <= 10, "there are more than 10 secret hashes");
        require(_assignedRoles.length <= 10, "there are more than 10 roles");
        require(_assignedRoles.length == _secretHashes.length, "roles and length not equal");

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

        // emit GroupCreated event
        emit GroupCreated(groupId, _sender, _metadataLocator);

        // set groupCreator as sender
        storageContract.putAddressValue(keccak256(
            abi.encodePacked(GROUP_KEY, groupId, "groupStruct", "groupCreator")),
            _sender
        );

        // call addMember function to add sender as admin to newly created group
        addMember(_sender, groupId, admin);

        if(_secretHashes.length > 0)
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

    /**
     *  addMember
     *  @dev Creates a new member
     *  @param _sender address of sender who originated group creation
     *  @param _groupId from the sequence public uint256 (group id)
     *  @param _role role (permissions level) address to be set to
     *  @return bool when member is successfully added
     */

    function addMember(
        address _sender,
        uint256 _groupId,
        uint8 _role
    )
        internal
        returns (bool)
    {
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _sender)),
            _role
        );

        // emit Member Added event
        emit MemberAdded(_sender, _groupId, _role);
    }

    /**
     *  removeMember
     *  @dev logic function to remove member from group
     *  @param _sender tx sender
     *  @param _groupId group id to remove member from
     *  @param _accountToRemove account to be removed 
     *  @return bool upon successful removal of member 
     */

    function removeMember(
        address _sender,
        uint256 _groupId,
        address _accountToRemove
    )
        internal
        returns (bool)
    {
        //uint256 signerRole = storageContract.getUintValue(
        //    keccak256(
        //        abi.encodePacked(
        //            MEMBER_KEY,
        //            _groupId,
        //            _sender
        //        )
        //    )
        //);

        // ensure sender is an admin of the group
        require(_accountToRemove == _sender || isAdmin(_groupId, _sender));

        // retrieving previous role to populate MemberRemoved event
        uint256 prevRole = storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToRemove))
        );

        // now set member's role to 0
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToRemove)),
            0
        );

        // emit Member Removed event
        emit MemberRemoved(_groupId, _accountToRemove, uint8(prevRole));

        return true;
    }

    /**
     *  changeMemberRole
     *  @dev transaction function to change member role of a group
     *  @param _sender tx sender
     *  @param _groupId group id member belongs to
     *  @param _accountToChange account being changed 
     *  @param _newRole new role for the member
     *  @return bool upon successful transaction
     */

    function changeMemberRole(
        address _sender,
        uint256 _groupId,
        address _accountToChange,
        uint8 _newRole
    )
        internal
        returns (bool)
    {
        uint256 signerRole = storageContract.getUintValue(
            keccak256(
                abi.encodePacked(
                    MEMBER_KEY,
                    _groupId,
                    _sender
                )
            )
        );

        // ensure sender is an admin of the group
        require(uint8(signerRole) == admin);

        // check if accountToChange belongs to the community
        isMember(_groupId, _accountToChange);

        // retrieving previous role to populate MemberRemoved event
        uint256 prevRole = storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToChange))
        );

        // set member to new role
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToChange)),
            _newRole
        );

        // emit Member Role Changed event
        emit MemberRoleChanged(
            _groupId, _accountToChange, _newRole, uint8(prevRole));

        return true;
    }

    /**
     *  storeInvitation 
     *  @dev logic function to store invitation 
     *  @param _sender tx sender
     *  @param _groupId group id user will be invited to
     *  @param _role assigned role for the member
     *  @param _secretHash hash generated by backend
     *  @return bool upon successful transaction
     */

    function storeInvitation(
        address _sender,
        uint256 _groupId,
        uint8   _role,
        bytes32 _secretHash
    )
        internal
        returns (bool)
    {
        // require address storing invite is an admin
        require(isAdmin(_groupId, _sender), "_sender is not an admin");

        // require role to exist
        require(storageContract.getBooleanValue(
                keccak256(
                    abi.encodePacked(
                        "ADDITIONAL_ROLES",
                        _role
                    )
                )
            ) == true, "role does not exist");

        // retrieve enable value from external storage
        bool enabled = storageContract.getBooleanValue(keccak256(
            abi.encodePacked(GROUP_KEY, _groupId, "ENABLED"))
        );

        // require groupId to be enabled
        require(enabled == true, "group is not enabled");

        // set recovered signer as _sender address
        storageContract.putAddressValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "SIGNER")),
            // msgHash from call to prepareInvitation()
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

    /**
     *  revokeInvitation 
     *  @dev logic function to revoke pending invitation 
     *  @param _sender tx sender
     *  @param _groupId group id to invite user to
     *  @param _secretHash hash generated by backend
     *  @return bool upon successful transaction
     */

    function revokeInvitation(
        address _sender,
        uint256 _groupId,
        bytes32 _secretHash
    )
        internal
        returns (bool)
    {
        uint256 signerRole = storageContract.getUintValue(
            keccak256(
                abi.encodePacked(
                    MEMBER_KEY,
                    _groupId,
                    _sender
                )
            )
        );

        // ensure sender is an admin of the group
        require(uint8(signerRole) == admin);

        // set invitation state to 'Revoked'
        storageContract.putUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "STATE")),
            uint(InvitationState.Revoked)
        );

        // emit Invitation Revoked event
        emit InvitationRevoked(_groupId, uint8(signerRole), _secretHash);

        return true;
    }

    /**
     *  acceptInvitationCommit
     *  @dev logic function to perform commit for accepting invitation
     *  @param _sender tx sender
     *  @param _groupId group id to invite user to
     *  @param _addressSecretHash hash of (secret + address)
     *  @return bool upon successful transaction
     */

    function acceptInvitationCommit(
        address _sender,
        uint256 _groupId,
        bytes32 _addressSecretHash
    )
        internal
        returns (bool)
    {
        commits[_sender].id          = _groupId;
        commits[_sender].commit      = _addressSecretHash;
        commits[_sender].block       = uint64(block.number);
        commits[_sender].revealed    = false;

        emit AcceptCommitted(_groupId, _addressSecretHash);
        return true;
    }

    /**
     *  acceptInvitationLogic
     *  @dev logic function to accept invitation
     *  @param _sender tx sender
     *  @param _groupId group id of corresponding invite 
     *  @param _secret hash 
     *  @return bool upon successful transaction
     */

    function acceptInvitationLogic(
        address _sender,
        uint256 _groupId,
        bytes32 _secret
    )
        internal
        returns (bool)
    {
        // assign reference to ephemeral Commit struct
        Commit storage tempCommit = commits[_sender];

        // retrieve secretHash
        bytes32 secretHash      = storageContract.getBytes32Value(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, keccak256(abi.encodePacked(_secret)), "SECRET_HASH"))
        );

        // retrieve expiration date from ext. storage
        uint expirationDate     = storageContract.getUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, keccak256(abi.encodePacked(_secret)), "EXPIRATION_DATE"))
        );

        // retrieve preset role for invited user from ext. storage
        uint role               = storageContract.getUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, keccak256(abi.encodePacked(_secret)), "ROLE")
        ));

        // verify that hashed '_secret' == 'secretHash'
        require(
            keccak256(abi.encodePacked(_secret)) == secretHash,
            "hashed provided 'secret' does not match stored 'secretHash'"
        );

        // require current block to be greater than block the commit was recorded
        require(block.number > tempCommit.block);

        // require current time to be before the expiration date
        require(block.timestamp < expirationDate);

        // require that temporary commit is not already revealed
        require(!tempCommit.revealed);

        // then set to revealed
        tempCommit.revealed = true;

        // implicit conversion from uint256 -> uint8 for 'role'
        addMember(_sender, _groupId, uint8(role));

        return true;
    }

    ///////////////////////////////////////////////////////////////////////
    // UTILS
    ///////////////////////////////////////////////////////////////////////

    /**
     *  getRole
     *  @dev helper function to retrieve user role
     *  @param _groupId groupId to retrieve role from
     *  @param _addr address of user within group
     *  @return uint256 role of user
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

    /**
     *  isAdmin 
     *  @dev helper function to check if user is admin
     *  @param _groupId groupId to perform admin check on
     *  @param _addr address of proposed admin check
     *  @return bool if address is an admin of provided group
     */

    function isAdmin(
        uint256 _groupId,
        address _addr
    )
        public
        view
        returns (bool)
    {
        require(storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _addr))
        ) == 1);

        return true;
    }

    /**
     *  isMember
     *  @dev helper function to check if user is member of provided group
     *  @param _groupId groupId to perform member check on
     *  @param _addr address of proposed member check
     *  @return bool if address is a member of provided group
     */

    function isMember(
        uint256 _groupId,
        address _addr
    )
        public
        view
        returns (bool)
    {
        require(storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _addr))
        ) > 0);

        return true;
    }

    /**
     *  getInvitationState 
     *  @dev helper function to check what state invitation is in
     *  @dev 0 = Pending, 1 = Revoked, 2 = Accepted
     *  @param _groupId groupId to perform member check on
     *  @param _secretHash hash of invitation
     *  @return uint state of invitation
     */

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
