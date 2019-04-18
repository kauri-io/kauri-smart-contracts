pragma solidity 0.5.6;

import './Group.sol';

contract GroupConnector
{
    Group groupLogic;

    /*
     *  Create Group
     */ 

    // TRANSACTION 
    function createGroup(
        bytes32 _metadataLocator 
    )
        public
        returns (bool)
    {
        return groupLogic.createGroup(msg.sender, _metadataLocator);
    }

    // PREPARE HASH FOR META-TRANSACTION
    function prepareCreateGroup(
        bytes32 _metadataLocator,
        uint256 _nonce
    )
        public
        view
        returns (bytes32)
    {
        return groupLogic.prepareCreateGroup(_metadataLocator, _nonce);
    }

    // META-TRANSACTION
    // signature / ecrecovering completed in GroupConnector
    // Group.sol should just contain only business logic
    function createGroup(
        bytes32 _metadataLocator,
        bytes memory _signature,
        uint256 _nonce,
        bytes32[] memory _secretHashes,
        uint[] memory _assignedRoles,
        uint[] memory _assignedNonces
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

        return groupLogic.createGroup(
            signer, 
            _metadataLocator, 
            _secretHashes, 
            _assignedRoles
        );
        // + array []bytes32 secretHashes, array []uint of roles inlcuded in arguments
        // loop for each secretHash, roles and call storeInvitation() with each of these arguments in logic
    }

    /*
     *  Remove Member
     */ 

    function prepareRemoveMember(
        uint256 _groupId,
        address _accountToRemove,
        uint256 _nonce
    )
        public
        view
        returns (bytes32)
    {
        return groupLogic.prepareRemoveMember(_groupId, _accountToRemove, _nonce);
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
        return groupLogic.removeMember(_groupId, _accountToRemove, _signature, _nonce);
    }

    /*
     *  Change Member Role
     */ 

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
        return groupLogic.prepareChangeMemberRole(_groupId, _accountToChange, _role, _nonce);
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
        return groupLogic.changeMemberRole(_groupId, _accountToChange, _newRole, _signature, _nonce);
    }

    /*
     *  Invite Member
     */ 

    function prepareInvitation(
        uint256 _groupId,
        uint8 _role,
        bytes32 _secretHash,
        uint256 _nonce
    )
        public
        view
        returns (bytes32)
    {
        return groupLogic.prepareInvitation(_groupId, _role, _secretHash, _nonce);
    }

    function storeInvitation(
        uint256 _groupId,
        uint8 _role,
        bytes32 _secretHash,
        bytes memory _signature,
        uint256 _nonce
    )
        public
        returns (bool)
    {
        return groupLogic.storeInvitation(_groupId, _role, _secretHash, _signature, _nonce);
    }

    /*
     *  Revocation of Invitation
     */ 

    function prepareRevokeInvitation(
        uint256 _groupId,
        bytes32 _secretHash,
        uint256 _nonce
    )
        public
        view
        returns (bytes32)
    {
        return groupLogic.prepareRevokeInvitation(_groupId, _secretHash, _nonce);
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
        return groupLogic.revokeInvitation(_groupId, _secretHash, _signature, _nonce);
    }

    /*
     *  Acceptance of Invitation
     */ 

    function prepareAcceptInvitationCommit(
        uint256 _groupId,
        bytes32 _addressSecretHash,
        uint256 _nonce
    )
        public
        view
        returns (bytes32)
    {
        return groupLogic.prepareAcceptInvitationCommit(_groupId, _addressSecretHash, _nonce);
    }

    function acceptInvitationCommit(
        uint256 _groupId,
        bytes32 _addressSecretHash,
        bytes memory _signature,
        uint256 _nonce
    )
        public
        returns (bool)
    {
        return groupLogic.acceptInvitationCommit(_groupId, _addressSecretHash, _signature, _nonce);
    }

    function acceptInvitation(
        uint256 _groupId,
        bytes32 _secret,
        address _sender
    )
        public
        returns (bool)
    {
        return groupLogic.acceptInvitation(_groupId, _secret, _sender);
    }

    /*
     *  Utils
     */ 

    function getKeccak(
        bytes32 _input
    )
        public
        view
        returns (bytes32)
    {
        return groupLogic.getKeccak(_input);
    }

    function getNonce(
        address _sender
    )
        public
        view
        returns (uint256)
    {
        return groupLogic.getNonce(_sender);
    }

    function getRole(
        uint256 _groupId,
        address _addr
    )
        public
        view
        returns (uint256)
    {
        return groupLogic.getRole(_groupId, _addr);
    }

    function isAdmin(
        uint256 _groupId,
        address _addr
    )
        public
        view
        returns (bool)
    {
        return groupLogic.isAdmin(_groupId, _addr);
    }

    function getInvitationState(
        uint256 _groupId,
        bytes32 _secretHash
    )
        public
        view
        returns (uint)
    {
        return groupLogic.getInvitationState(_groupId, _secretHash);
    }

    // getSigner (from Group.sol, need to move into folder)
    function getSigner(
        bytes32 _msg, 
        bytes memory _signature, 
        uint256 _nonce
    )
        internal
        view 
        returns (address)
    {
        address signer = recoverSignature(_msg, _signature);

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
    
    // recoverSignature()
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

}
