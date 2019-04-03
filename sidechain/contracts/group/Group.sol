pragma solidity ^0.5.6;

import './GroupI.sol';
import '../common/UsingExternalStorage.sol';

contract Group is GroupI, UsingExternalStorage
{
    /*
     *  Constants for hashing storage keys
     */ 

    string  constant GROUP_KEY      = "community";
    string  constant MEMBER_KEY     = "member";
    
    /* 
     *  Role constants; admin is default 1
     */

    uint8   constant admin        = 1; 
    uint8[] public   roles;

    /*
     *  Nonce mapping and sequence (groupId) */ 
    
    mapping(address => uint256) public nonces;
    uint256 public sequence; 
        
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
        }
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
        bytes32 hash = prepareCreateGroup(_metadataLocator, _nonce);
        address signer = getSigner(hash, _signature, _nonce);

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
        // set group to ENABLED 
        storageContract.putBooleanValue(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "ENABLED")),  
            true                                               
        );
        
        // set groupId as sequence (uint256)
        storageContract.putUintValue(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "groupStruct", "groupId")),   
            sequence                                                            
        );

        // set metadataLocator to group "struct"
        storageContract.putBytes32Value(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "groupStruct", "metadataLocator")), 
            _metadataLocator
        );

        // emit GroupCreated event 
        emit GroupCreated(sequence, _sender, _metadataLocator); 

        // set groupCreator as sender
        storageContract.putAddressValue(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "groupStruct", "groupCreator")), 
            _sender
        );

        addMember(sequence, _sender, admin); 

        sequence++;

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
        address _sender, 
        uint8 _role
    )
        internal
        returns (bool)
    {
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId, _sender)), 
            _role
        ); 

        emit MemberAdded(_sender, _groupId, _role);
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
        
        require(signer != address(0), "unable to recover signature");
        require(_nonce == nonces[signer], "incorrect nonce");
        
        nonces[signer]++;
        
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

    /////////////////////////
    //
    //  invitation logic
    //

    function inviteUserToGroupSignature(
        uint256 _groupId, 
        uint8   _role,
        bytes32 _secretHash,
        uint256 _nonce
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_groupId, _role, _secretHash, _nonce));
    }

    function inviteToCommunity(
        uint256 _groupId, 
        uint8   _role,
        bytes32 _secretHash,
        bytes memory _signature,
        uint256 _nonce
    )
        public
        returns (bool) // the doc says return txHash, so we'll wait for tx receipt?
    {
        address _signer = getSigner(_secretHash, _signature, _nonce);
        addMember(_groupId, _signer, _role);
        emit InvitationPending(_groupId, _role, _secretHash);
        return true;
    }

    /////////////////////////
    //
    //  invitation events
    //

    event InvitationPending(uint256 indexed groupId, uint8 indexed role, bytes32 secretHash);
    event AcceptedCommit(bytes32 addressSecretHash);
}

