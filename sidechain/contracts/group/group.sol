pragma solidity ^0.5.6;

import '../common/UsingExternalStorage.sol';

// TODO: move interfaces to own file
interface IGroupMetaTx
{
    function prepareCreateGroup(bytes32 _metadataLocator, uint256 _nonce) external view returns (bytes32);
    function createGroup(bytes32 _metadataLocator, bytes calldata _signature, uint256 _nonce) external returns (bool);
}

interface IGroupCommon // can we include both functions in one interface, function overloading
{
    function createGroup(bytes32 _metadataLocator) external returns (bool);
}

contract Group is IGroupMetaTx, IGroupCommon, UsingExternalStorage
{
    // string constants for storage contract hashes
    string  constant GROUP_KEY      = "community";
    string  constant MEMBER_KEY     = "member";
    string  constant CURATOR_KEY    = "curator";
    
    // role constants 
    uint8   constant admin        = 1;
    uint8   constant moderator    = 2;
    uint8   constant supermoderator = 3;
    uint8[] public   roles;
    
    mapping(address => uint256) public nonces;
    
    uint256 public sequence; 
    mapping(uint256 => Group) public groups;
        
    constructor(
        // make sure there's at least one role: the creator
        uint8[] memory _roles
    )
        public
    {
        roles = _roles;
        sequence = 0;
    }
    
    // meta functions 
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
                address(this), // address
                "createGroup", // string - "createGroup"
                _metadataLocator, // bytes32
                _nonce // uint256
                )
            );
    }
    
    // interface: IMetaTx
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
    
    function createGroup(
        bytes32 _metadataLocator
    )
        public
        returns (bool)
    {
        address sender = msg.sender;

        return createGroup(sender, _metadataLocator);
    }

    // internal functions 

    /**
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
        // set group to ENABLED status 
        storageContract.putBooleanValue(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "ENABLED")),  // key (bytes32)
            true                                                // value (bool)
        );
        
        // set groupId as sequence (uint256)
        storageContract.putUintValue(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "groupStruct", "groupId")),   // key (bytes32)
            sequence                                                            // value (uint256)
        );

        // set metadataLocator to group "struct"
        storageContract.putBytes32Value(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "groupStruct", "metadataLocator")), _metadataLocator
        );

        // emit GroupCreated event 
        emit GroupCreated(sequence, _sender);

        // set groupCreator as sender
        storageContract.putAddressValue(keccak256(
            abi.encodePacked(GROUP_KEY, sequence, "groupStruct", "groupCreator")), _sender
        );

        // add sender as creator + as an admin (do this in a separate method)
        addMember(sequence, _sender, admin); // groupCreator automatically set to 1

        sequence++;

        return true;
    }

    function addMember(uint256 _groupId, address _sender, uint8 _role)
        internal
        returns (bool)
    {
        storageContract.putUintValue(keccak256(
            abi.encodePacked(MEMBER_KEY, _groupId)), _role // uint8 is type converted to uint256 here
        ); 

        emit MemberAdded(_sender, _groupId, _role);
    }
    
    function getSigner(bytes32 _msg, bytes memory _signature, uint256 _nonce)
    internal
    returns (address)
    {
        address signer = recoverSignature(_msg, _signature);
        
        require(signer != address(0), "unable to recover signature");
        require(_nonce == nonces[signer], "incorrect nonce");
        
        nonces[signer]++;
        
        return signer;
    }
    
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
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _hash
                )
            ),
            v, 
            r, 
            s
        );
        return sender;
    }

    // events
    event GroupCreated(uint256 indexed groupId, address indexed groupOwner);
    event MemberAdded(address indexed member, uint256 indexed groupId, uint8 indexed role);
    
}

