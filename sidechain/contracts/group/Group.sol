pragma solidity ^0.5.6;

import './GroupI.sol';
import '../common/UsingExternalStorage.sol';

contract Group is GroupI, UsingExternalStorage
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
    uint expirationPeriod           = 3 days;

    /*
     *  Nonce mapping and sequence (groupId) 
     */ 
    
    mapping(address => uint256) public nonces;
    mapping(address => bytes32) public temporaryInvitation;

    struct Commit
    {
        uint256 id;
        bytes32 commit;
        bytes   sig;
        uint64  block;
        bool    revealed;
    }

    mapping(address => Commit) public commits;

     /*
      * Enum for Invitation State
      */ 
    
    enum InvitationState { Pending, Revoked, Accepted }
    InvitationState InvState;
    InvitationState constant defaultState = InvitationState.Pending;

    /*************************
     *  Constructor 
     *************************/

    /*
     *  @dev Sets roles additional to admin (role 1)
     *  @dev Roles are to be defined via documentation
     *
     *  @param _additionalRoles uint8 array of additional roles
     */

    constructor(
        uint8[] memory _additionalRoles
    )
        public
    {
        roles = _additionalRoles;
        for (uint i = 0; i < roles.length; i++) 
        {
            require(roles[i] > 1);

            // possible solution: create another function:
            // 'setRoles()' and send them to external store
            // can't do that in the constructor b/c of migrations
            // in storeInvitation() we can then check role exists more easily

            // store additional roles in a mapping

//            storageContract.putBooleanValue(keccak256(
//                abi.encodePacked("ADDITIONAL_ROLES", roles[i])),
//                true
//            );
        }
    }

    function getNonce(
        address _sender
    )
        public
        view
        returns (uint256)
    {
        return storageContract.getUintValue(
            keccak256(
                abi.encodePacked(
                    "nonces",
                    _sender
                )
            )
        );
    }
    
    /*************************
     *  Public Functions
     *************************/

    /*
     *  @dev Prepares Keccak256 hash of abi tightly packed encoding
     *
     *  @param _metadataLocator IPFS hash for locating metadata 
     *  @param _nonce nonce included to prevent signature replay 
     * 
     *  @returns bytes32 hash to be signed with private key
     */

    function prepareCreateGroup(
        bytes32 _metadataLocator, 
        uint256 _nonce
    )
        public 
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this), 
                "createGroup", 
                _metadataLocator,
                _nonce 
                )
            );
    }
    
    /*
     *  @dev Retrieves hash from prepareCreateGroup function
     *  @dev and uses hash + signature to ecrecover signer's address
     *
     *  @param _metadataLocator IPFS hash for locating metadata 
     *  @param _signature bytes array of signed hash
     *  @param _nonce nonce included to prevent signature replay 
     * 
     *  @returns bool true when successful group creation
     */

    function createGroup(
        bytes32 _metadataLocator, 
        bytes memory _signature, 
        uint256 _nonce
    )
        public
        returns (bool)
    {
        address signer = getSigner(
            prepareCreateGroup(
                _metadataLocator,
                _nonce
            ),
            _signature, 
            _nonce
        );

        return createGroup(signer, _metadataLocator);
    }
    
    /*
     * @dev Creates a group with msg.sender address and metadata. 
     * @dev Sets msg.sender as role[0] as group creator with highest permissions. 
     * 
     * @dev Reverts if: 
     *      - neither params are provided
     * 
     * @param _sender msg.sender OR ecrecovered address from meta-tx
     * @param _metadataLocator IPFS hash for locating metadata
     * 
     * @returns bool true when successful group creation
     */

    function createGroup(
        bytes32 _metadataLocator
    )
        public
        returns (bool)
    {
        address sender = msg.sender;

        return createGroup(sender, _metadataLocator);
    }

    /*************************
     *  Internal Functions
     *************************/

    /*
     * @dev Creates a group with sender address and metadata. 
     * @dev Sets sender as role[0] as group creator with highest permissions. 
     * 
     * @dev Reverts if: 
     *      - neither params are provided
     * 
     * @param _sender msg.sender OR ecrecovered address from meta-tx
     * @param _metadataLocator IPFS hash for locating metadata
     */

    function createGroup(
        address _sender, 
        bytes32 _metadataLocator
    )
        internal
        returns (bool)
    {
        // moving groupId to external storage (as opposed to contract state var)
        // TODO: does external storage need to be initialized to 0?
        // AFAIK storage defaults at 0
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
        
        addMember(groupId, _sender, admin); 

        // increment groupId
        storageContract.incrementUintValue(keccak256(
            abi.encodePacked("groupId")),   
            1
        );

        // call addMember internal function, emit MemberAdded event
        return true;
    }

    /*
     *  @dev Creates a new member
     * 
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

    function prepareRemoveMember(
        uint256 _groupId,
        address _accountToRemove,
        uint256 _nonce
    )
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _groupId,
                "removeMember",
                _accountToRemove,
                _nonce
            )
        );
    }

    function removeMember(
        uint256 _groupId,
        address _accountToRemove,
        bytes memory _signature,
        uint256 _nonce
    )
        public
        returns (bool)
    {
        uint256 signerRole = storageContract.getUintValue(
            keccak256(
                abi.encodePacked(
                    MEMBER_KEY, 
                    _groupId, 
                    getSigner(
                        prepareRemoveMember(
                            _groupId, 
                            _accountToRemove, 
                            _nonce
                        ), 
                        _signature, 
                        _nonce
                    )
                )
            )
        );

        require(uint8(signerRole) == admin);

        // retrieving previous role to populate MemberRemoved event
        uint256 prevRole = storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToRemove))
        );

        // now set member's role to 0
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToRemove)), 
            0 
        ); 

        emit MemberRemoved(_groupId, _accountToRemove, uint8(prevRole));

        return true;
    }

    function prepareChangeMemberRole(
        uint256 _groupId,
        address _accountToChange,
        uint8 _role,
        uint256 _nonce
    )
        public
        view 
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _groupId,
                "changeMemberRole",
                _accountToChange,
                _role,
                _nonce
            )
        );
    }

    function changeMemberRole(
        uint256 _groupId,
        address _accountToChange,
        uint8 _newRole,
        bytes memory _signature,
        uint256 _nonce
    )
        public
        returns (bool)
    {
        uint256 signerRole = storageContract.getUintValue(
            keccak256(
                abi.encodePacked(
                    MEMBER_KEY, 
                    _groupId, 
                    getSigner(
                        prepareChangeMemberRole(    // retrieve msgHash
                            _groupId,
                            _accountToChange,  
                            _newRole,
                            _nonce
                        ), 
                        _signature, 
                        _nonce
                    )
                )
            )
        );

        require(uint8(signerRole) == admin);

        // retrieving previous role to populate MemberRemoved event
        uint256 prevRole = storageContract.getUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToChange))
        );

        // set member to new role
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _accountToChange)), 
            _newRole
        ); 

        emit MemberRoleChanged(
            _groupId, _accountToChange, _newRole, uint8(prevRole));

        return true;
    }
    
    /*
     *  @dev Calls recoverSignature function
     *  @dev with require statements and increments nonce
     * 
     *  @param _msg Hash from prepareCreateGroup to be signed
     *  @param _signature Signed hash
     *  @param _nonce Nonce to prevent replay attack
     * 
     *  @returns Address of account that signed hash
     */ 

    function getSigner(
        bytes32 _msg, 
        bytes memory _signature, 
        uint256 _nonce
    )
        internal
        returns (address)
    {
        address signer = recoverSignature(_msg, _signature);

        uint256 nonce = storageContract.getUintValue(
            keccak256(
                abi.encodePacked("nonces", signer))
        );
        
        require(signer != address(0), "unable to recover signature");
        require(_nonce == nonces[signer], "incorrect nonce");
        
        // increment signature nonce of signer by 1
        storageContract.incrementUintValue(
            keccak256(abi.encodePacked("nonces", signer)),
            1
        );
        
        
        return signer;
    }
    
    /*
     *  @dev Recovers signer of hash using signature
     * 
     *  @param _msg Hash from prepareCreateGroup to be signed
     *  @param _signature Signed hash
     * 
     *  @returns Address of ecrecovered account
     */ 

    function recoverSignature(
        bytes32 _hash, 
        bytes memory _signature
    )
        internal
        pure
        returns (address)
    {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        if (_signature.length != 65) {
            return address(0);
        }
        
        assembly {
            r := mload(add(_signature, 0x20)) 
            s := mload(add(_signature, 0x40)) 
            v := byte(0, mload(add(_signature, 0x60))) 
        }
        
        if (v < 27) {
            v += 27;
        
        }
        
        address sender = ecrecover(
            prefixed(_hash),
            v, 
            r, 
            s
        );
        return sender;
    }

    function prefixed(
        bytes32 _hash
    )
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash));
    }

    /*
     *  Preparation of an Invitation
     */

    // prepare invitation
    function prepareInvitation(
        uint256 _groupId, 
        uint8   _role,
        bytes32 _secretHash,
        uint256 _nonce
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _groupId, 
                "storeInvitation", // for sig uniqueness
                _role, 
                _secretHash, 
                _nonce
            )
        );
    }

    // store invitation 
    function storeInvitation(
        uint256 _groupId, 
        uint8   _role,
        bytes32 _secretHash,
        bytes memory _signature,
        uint256 _nonce
    )
        public
        returns (bool) 
    {
//        uint role = storageContract.getUintValue(keccak256(
//            abi.encodePacked(INVITATION_)
//        ));

        // recover signer, and set as address
        storageContract.putAddressValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "SIGNER")), 
            // msgHash from call to prepareInvitation()
            getSigner(prepareInvitation(_groupId, _role, _secretHash, _nonce), _signature, _nonce)
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
     *  Revocation of a Pending Invitation
     */ 

    // prepare to revoke a pending invitation
    function prepareRevokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        uint256 _nonce
    )
        public
        pure 
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _groupId, 
                "revokeInvitation",
                _secretHash, 
                _nonce
            )
        );
    }
    
    function revokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        bytes memory _signature,
        uint256 _nonce
    )
        public
        returns (bool)
    {
        uint256 signerRole = storageContract.getUintValue(
            keccak256(
                abi.encodePacked(
                    MEMBER_KEY, 
                    _groupId, 
                    getSigner(
                        prepareRevokeInvitation(
                            _groupId, 
                            _secretHash, 
                            _nonce
                        ), 
                        _signature, 
                        _nonce
                    )
                )
            )
        ); 

        require(uint8(signerRole) == admin);

        storageContract.putUintValue(keccak256(
            abi.encodePacked(INVITATION_KEY, _groupId, _secretHash, "STATE")),
            uint(InvitationState.Revoked)
        );

        return true;
    }

    /*
     *  Accepting an Invitation
     */ 

    function prepareAcceptInvitationCommit(
        uint256 _groupId,
        bytes32 _addressSecretHash,
        uint256 _nonce
    )
        public
        pure 
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _groupId,
                "acceptInvitationCommit",
                _addressSecretHash,
                _nonce
            )
        );
    }

    function acceptInvitationCommit(
        uint256         _groupId,
        bytes32         _addressSecretHash,
        bytes memory    _signature,
        uint256         _nonce
    )
        public
        returns (bool)
    {
        // get sender by retrieving from signature
        address sender = getSigner(
            prepareAcceptInvitationCommit(
                _groupId,
                _addressSecretHash,
                _nonce
            ), 
            _signature, 
            _nonce
        );

        commits[sender].id          = _groupId;
        commits[sender].commit      = _addressSecretHash;
        commits[sender].sig         = _signature;
        commits[sender].block       = uint64(block.number);
        commits[sender].revealed    = false;

        emit AcceptCommitted(_groupId, _addressSecretHash);
        return true;
    }

    function acceptInvitation(
        uint256 _groupId,
        bytes32 _secret,
        address _sender
    )
        public
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
            keccak256(abi.encodePacked(_secret))                == secretHash, 
            "hashed provided 'secret' does not match stored 'secretHash'"
        );

        // verify that hashed '_secret + sender address' == 'addressSecretHash'
        //require(
        //    keccak256(abi.encodePacked(_secret, _sender))       == tempCommit.commit, 
        //    "provided hashed '_secret + sender address does not match 'addressSecretHash"
        //);
        
        // require current block to be greater than block the commit was recorded
        require(block.number > tempCommit.block);

        // require current time to be before the expiration date
        require(block.timestamp < expirationDate);
        
        // require that temporary commit is not already revealed
        require(!tempCommit.revealed);

        // then set to revealed
        tempCommit.revealed = true;

        // implicit conversion from uint256 -> uint8 for 'role'
        addMember(_groupId, _sender, uint8(role));

        // not necessary to return anything, but will keep for now
        return true;
    }

    function getKeccak(
        bytes32 _input
    )
        public
        view
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_input));
    }

}

