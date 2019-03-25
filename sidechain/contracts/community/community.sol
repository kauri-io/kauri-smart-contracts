pragma solidity ^0.5.6;

import '../common/UsingExternalStorage.sol';

// TODO: move interfaces to own file
interface IMetaTx
{
    function prepareCreateGroup(bytes32 _metadataLocator, uint256 _nonce) external view returns (bytes32);
    function createGroup(bytes32 _metadataLocator, bytes calldata _signature, uint256 _nonce) external returns (bool);
}

interface ICommon // can we include both functions in one interface, function overloading
{
    function createGroup(bytes32 _metadataLocator) external returns (bool);
}

contract Communities is IMetaTx, ICommon, UsingExternalStorage
{
    // string constants for storage contract hashes
    string  constant COMMUNITY_KEY      = "community";
    string  constant ADMIN_KEY          = "admin";
    string  constant CURATOR_KEY        = "curator";
    
    // role constants 
    uint8   constant admin        = 1;
    uint8   constant moderator    = 2;
    uint8[] public   roles;
    
    mapping(address => uint256) public nonces;
    
    struct User
    {
        address userAddress;
        uint8 userRole;
    }
    
    struct Group
    {
        bytes32 metadataLocator;
        address groupCreator;
        User[] users;
    }
    
    uint256 public sequence; // what is this?
    mapping(uint256 => Group) public groups;
        
    constructor(
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
                "createGroup", // string
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
    function createGroup(
        address _sender, 
        bytes32 _metadataLocator
    )
        internal
        returns (bool)
    {
        uint existingCommunityStatus = storageContract.getUintValue(keccak256(abi.encodePacked(COMMUNITY_KEY, sequence)));
        require(existingCommunityStatus == 0);

        groups[sequence].metadataLocator = _metadataLocator;
        groups[sequence].groupCreator = _sender;
        
        //User[] memory users; 
        //users[0] = User(msg.sender, admin);

        storageContract.putBooleanValue(keccak256(abi.encodePacked(COMMUNITY_KEY, sequence)), true);
        storageContract.putBytes32Value(keccak256(abi.encodePacked(COMMUNITY_KEY, sequence)), _metadataLocator);
        storageContract.putAddressValue(keccak256(abi.encodePacked(COMMUNITY_KEY, sequence)), _sender);

        sequence++;

        return true;
    }
    
    function getSigner(bytes32 _msg, bytes memory _signature, uint256 _nonce)
    internal
    returns (address)
    {
        address signer = recoverSignature(_msg, _signature);
        
        require(signer != address(0), "cannot recover signature");
        require(_nonce == nonces[signer], "wrong nonce");
        
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
    
}

