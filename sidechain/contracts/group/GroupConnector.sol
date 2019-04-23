pragma solidity 0.5.6;

import './GroupLogic.sol';
import './GroupI.sol';

contract GroupConnector is GroupI, GroupLogic
{

    //////////////////////////////////////////////////
    // CREATE_GROUP
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareCreateGroup
     */

    function prepareCreateGroup(
        bytes32 _metadataLocator,
        bytes32[] calldata _secretHashes,
        uint8[] calldata _assignedRoles,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this),
                "createGroup",
                _metadataLocator,
                _secretHashes,
                _assignedRoles,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] createGroup
     */ 

    function createGroup(
        bytes32 _metadataLocator,
        bytes32[] calldata _secretHashes,
        uint8[] calldata _assignedRoles,
        bytes calldata _signature,
        uint256 _nonce
    )
        external 
        returns (bool)
    {
        address signer = getSigner(
            this.prepareCreateGroup(
                _metadataLocator,
                _secretHashes,
                _assignedRoles,
                _nonce
            ),
            _signature,
            _nonce
        );

        //call the logic
        createGroup(signer, _metadataLocator, _secretHashes, _assignedRoles);
    }

    /**
     *  [DIRECT-TX] createGroup
     */

    function createGroup(
        bytes32 _metadataLocator,
        bytes32[] calldata _secretHashes,
        uint8[] calldata _assignedRoles
    )
        external 
        returns (bool)
    {
        createGroup(msg.sender, _metadataLocator, _secretHashes, _assignedRoles);
    }

    //////////////////////////////////////////////////
    // STORE_INVITATION
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareInvitation
     *  TODO
     *
     */

    function prepareInvitation(
        uint256 _groupId,
        uint8 _role,
        bytes32 _secretHash,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        // generate unique method call message
        return keccak256(
            abi.encodePacked(
                address(this),
                "prepareInvitation",
                _groupId,
                _role,
                _secretHash,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] storeInvitation
     *  TODO
     *
     */

    function storeInvitation(
        uint256 _groupId,
        uint8 _role,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external 
        returns (bool)
    {
        address signer = getSigner(
            this.prepareInvitation(
                _groupId,
                _role,
                _secretHash,
                _nonce
            ),
            _signature,
            _nonce
        );

        storeInvitation(signer, _groupId, _role, _secretHash);
    }

    /**
     *  [DIRECT-TX] storeInvitation
     * 
     *
     */

    function storeInvitation(
        uint256 _groupId,
        uint8 _role,
        bytes32 _secretHash
    )
        external
        returns (bool)
    {
        storeInvitation(msg.sender, _groupId, _role, _secretHash);
    }

    //////////////////////////////////////////////////
    // REVOKE_INVITATION
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareRevokeInvitation
     *  TODO
     *
     */

    function prepareRevokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        // generate unique method call message
        return keccak256(
            abi.encodePacked(
                address(this),
                "revokeInvitation",
                _groupId,
                _secretHash,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] revokeInvitation
     *  TODO
     *
     */

    function revokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareRevokeInvitation(
                _groupId,
                _secretHash,
                _nonce
            ),
            _signature,
            _nonce
        );

        // call the logic
        revokeInvitation(signer, _groupId, _secretHash);
    }

    /**
     *  [DIRECT-TX] revokeInvitation
     *  TODO
     *
     */

    function revokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash
    )
        external
        returns (bool)
    {
        revokeInvitation(msg.sender, _groupId, _secretHash);
    }

    //////////////////////////////////////////////////
    // ACCEPT_INVITATION
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareAcceptInvitationCommit
     *
     *
     */

    function prepareAcceptInvitationCommit(
        uint256 _groupId,
        bytes32 _addressSecretHash,
        uint256 _nonce
    )
        external
        view
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

    /**
     *  [META-TX] acceptInvitationCommit
     */

    function acceptInvitationCommit(
        uint256 _groupId,
        bytes32 _addressSecretHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareAcceptInvitationCommit(
                _groupId,
                _addressSecretHash,
                _nonce
            ),
            _signature,
            _nonce
        );

        acceptInvitationCommit(signer, _groupId, _addressSecretHash);
    }
    
    /**
     *  [META-TX] acceptInvitationCommit
     */

    function acceptInvitationCommit(
        uint256 _groupId,
        bytes32 _addressSecretHash
    )
        external
        returns (bool)
    {
        // this wasn't included prior, it is now added 
        acceptInvitationCommit(msg.sender, _groupId, _addressSecretHash);
    }
    
    /**
     *  [META-TX] acceptInvitation
     */

    function acceptInvitation(
        address _signer,
        uint256 _groupId,
        bytes32 _secret
    )
        external 
        returns (bool)
    {
        acceptInvitationLogic(_signer, _groupId, _secret);
    }

    /**
     *  [DIRECT-TX] acceptInvitation
     */

    function acceptInvitation(
        uint256 _groupId,
        bytes32 _secret
    )
        external 
        returns (bool)
    {
        acceptInvitationLogic(msg.sender, _groupId, _secret);
    }

    //////////////////////////////////////////////////
    // REMOVE_MEMBER
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareRemoveMember
     *  TODO
     *
     */

    function prepareRemoveMember(
        uint256 _groupId,
        address _accountToRemove,
        uint256 _nonce
    )
        external 
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

    /**
     *  [META-TX] removeMember
     *  TODO
     *
     */

    function removeMember(
        uint256 _groupId,
        address _accountToRemove,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareRemoveMember(
                _groupId,
                _accountToRemove,
                _nonce
            ),
            _signature,
            _nonce
        );

        removeMember(signer, _groupId, _accountToRemove);
    }

    /**
     *  [DIRECT-TX] removeMember
     *  TODO
     *
     */

    function removeMember(
        uint256 _groupId,
        address _accountToRemove
    )
        external
        returns (bool)
    {
        removeMember(msg.sender, _groupId, _accountToRemove);
    }

    //////////////////////////////////////////////////
    // CHANGE_MEMBER
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareChangeMemberRole
     *  TODO
     *
     */

    function prepareChangeMemberRole(
        uint256 _groupId,
        address _accountToChange,
        uint8 _newRole,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                _groupId,
                "changeMemberRole",
                _accountToChange,
                _newRole, // changed from _role to _newRole
                _nonce
            )
        );
    }

    /**
     *  [META-TX] changeMemberRole
     *
     *
     */

    function changeMemberRole(
        uint256 _groupId,
        address _accountToChange,
        uint8 _newRole,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareChangeMemberRole(
                _groupId,
                _accountToChange,
                _newRole,
                _nonce
            ),
            _signature,
            _nonce
        );
            
        changeMemberRole(signer, _groupId, _accountToChange, _newRole);
    }

    /**
     *  [DIRECT-TX] changeMemberRole
     *  TODO
     *
     */

    function changeMemberRole(
        uint256 _groupId,
        address _accountToChange,
        uint8 _newRole
    )
        external
        returns (bool)
    {
        changeMemberRole(msg.sender, _groupId, _accountToChange, _newRole);
    }

    //////////////////////////////////////////////////
    // GET_NONCE 
    //////////////////////////////////////////////////

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

    ///////////////////////////////////////////////////////////////////////
    // UTILS 
    ///////////////////////////////////////////////////////////////////////

    function getSigner(
        bytes32 _msg, 
        bytes memory _signature, 
        uint256 _nonce
    )
        internal
        returns (address)
    {
        address signer = recoverSignature(_msg, _signature);

        //uint256 nonce = storageContract.getUintValue(
        //    keccak256(abi.encodePacked("nonces", signer))
        //);

        uint256 nonce = getNonce(signer);
        
        require(signer != address(0), "unable to recover signature");
        require(_nonce == nonce, "using incorrect nonce");
        
        // increment signature nonce of signer by 1
        storageContract.incrementUintValue(
            keccak256(abi.encodePacked("nonces", signer)),
            1
        );
        
        return signer;
    }
    
    /**
     *  @dev Recovers signer of hash using signature
     * 
     *  @param _hash Hash from prepareCreateGroup to be signed
     *  @param _signature Signed hash
     * 
     *  @return Address of ecrecovered account
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
        
        address signer = ecrecover(
            prefixed(_hash),
            v, 
            r, 
            s
        );
        return signer;
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

}
