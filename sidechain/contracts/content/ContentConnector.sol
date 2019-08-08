pragma solidity 0.5.6;

import './ContentLogic.sol';
import './ContentI.sol';

/**
 * @title Kauri GroupConnector Smart Contract
 * @author kauri@consensys.net
 * @dev functions are generally separated by meta-tx and direct-tx
 */

contract ContentConnector is ContentI, ContentLogic
{

    //////////////////////////////////////////////////
    // CREATE_CONTENT_SPACE
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepateCreateContentSpace
     *  @dev view function to prepare meta-tx for content space creation
     *  @param _spaceId the id of the space to create
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bytes32 hash to be signed by tx sender
     */

    function prepareCreateContentSpace(
        bytes32 _spaceId,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this),
                "createContentSpace",
                _spaceId,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] createContentSpace
     *  @dev transaction function creating a content space with relayer acting as middle-man
     *  @dev tx sender is recovered from signature of prepareCreateGroup result
     *  @param _spaceId the id of the space to create
     *  @param _signature signature of signed msg hash from prepareCreateContentSpace
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bool upon successful tx
     */

    function createContentSpace(
        bytes32 _spaceId,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareCreateContentSpace(
                _spaceId,
                _nonce
            ),
            _signature,
            _nonce
        );

        doCreateContentSpace(_spaceId, addressToBytes32(signer), OwnerType.ADDRESS);
    }

    /**
     *  [DIRECT-TX] createContentSpace
     *  @dev transaction function to directly create a content space without middle-man
     *  @dev sets msg.sender as the space owner
     *  @param _spaceId the id of the space to create
     *  @return bool upon successful tx
     */

    function createContentSpace(
        bytes32 _spaceId
    ) external returns (bool) {
        return doCreateContentSpace(_spaceId, addressToBytes32(msg.sender), OwnerType.ADDRESS);
    }

    function createContentSpace(
        bytes32 _spaceId,
        bytes32 _owner,
        OwnerType _ownerType
    ) external returns (bool) {
        return doCreateContentSpace(_spaceId, _owner, _ownerType);
    }

    //////////////////////////////////////////////////
    // TRANSFER CONTENT SPACE
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareTransferContentSpaceOwnership
     *  @dev view function to prepare meta-tx for content space transfer
     *  @param _spaceId the id of the space to transfer
     *  @param _newOwner the id of the new owner
     *  @param _newOwnerType the new owner type
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bytes32 hash to be signed by tx sender
     */

    function prepareTransferContentSpaceOwnership(
        bytes32 _spaceId,
        bytes32 _newOwner,
        OwnerType _newOwnerType,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this),
                "transferContentSpaceOwnership",
                _spaceId,
                _newOwner,
                _newOwnerType,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] transferContentSpaceOwnership
     *  @dev transaction function transferring space ownership with relayer acting as middle-man
     *  @dev tx sender is recovered from signature of prepareTransferContentSpaceOwnership result
     *  @param _spaceId the id of the space to transfer
     *  @param _newOwner the id of the new owner
     *  @param _newOwnerType the new owner type
     *  @param _signature signature of signed msg hash from prepareCreateContentSpace
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bool upon successful tx
     */

    function transferContentSpaceOwnership(
        bytes32 _spaceId,
        bytes32 _newOwner,
        OwnerType _newOwnerType,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareTransferContentSpaceOwnership(
                _spaceId,
                _newOwner,
                _newOwnerType,
                _nonce
            ),
            _signature,
            _nonce
        );

        return doTransferContentSpaceOwnership(_spaceId, _newOwner, _newOwnerType, signer);
    }

    /**
     *  [DIRECT-TX] transferContentSpaceOwnership
     *  @dev transaction function to transfer space ownership without middle-man
     *  @param _spaceId the id of the space to transfer
     *  @param _newOwner the id of the new owner
     *  @param _newOwnerType the new owner type
     *  @return bool upon successful tx
     */

    function transferContentSpaceOwnership(
        bytes32 _spaceId,
        bytes32 _newOwner,
        OwnerType _newOwnerType
    ) external returns (bool) {
        return doTransferContentSpaceOwnership(_spaceId, _newOwner, _newOwnerType, msg.sender);
    }

    //////////////////////////////////////////////////
    // PUSH REVISION COMMIT
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] preparePushRevisionCommit
     *  @dev view function to prepare meta-tx for push revision commit
     *  @param _commitHash the commit hash
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bytes32 hash to be signed by tx sender
     */

    function preparePushRevisionCommit(
        bytes32 _commitHash,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this),
                "pushRevisionCommit",
                _commitHash,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] pushRevisionCommit
     *  @dev transaction function for storing a push revision commit with relayer acting as middle-man
     *  @dev tx sender is recovered from signature of preparePushRevisionCommit result
     *  @param _commitHash the commit hash
     *  @param _signature signature of signed msg hash from preparePushRevisionCommit
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bool upon successful tx
     */

    function pushRevisionCommit(
        bytes32 _commitHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.preparePushRevisionCommit(
                _commitHash,
                _nonce
            ),
            _signature,
            _nonce
        );

        return doPushRevisionCommit(_commitHash, signer);
    }

    /**
     *  [DIRECT-TX] pushRevisionCommit
     *  @dev transaction function for storing a push revision commit without middle-man
     *  @param _commitHash the commit hhash
     *  @return bool upon successful tx
     */

    function pushRevisionCommit(
        bytes32 _commitHash
    ) external returns (bool) {
        return doPushRevisionCommit(_commitHash, msg.sender);
    }

    //////////////////////////////////////////////////
    // PUSH REVISION
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] preparePushRevision
     *  @dev view function to prepare meta-tx for pushing a revision
     *  @param _spaceId the space that the revision is to be pushed to
     *  @param _contentHash the ipfs hash of the revision content
     *  @param _parentRevision the parent of this new revision
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bytes32 hash to be signed by tx sender
     */

    function preparePushRevision(
        bytes32 _spaceId,
        bytes32 _contentHash,
        uint _parentRevision,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this),
                "pushRevision",
                _spaceId,
                _contentHash,
                _parentRevision,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] pushRevision
     *  @dev transaction function for pushing a new revision with relayer acting as middle-man
     *  @dev tx sender is recovered from signature of preparePushRevision result
     *  @param _spaceId the space that the revision is to be pushed to
     *  @param _contentHash the ipfs hash of the revision content
     *  @param _parentRevision the parent of this new revision
     *  @param _signature signature of signed msg hash from preparePushRevisionCommit
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bool upon successful tx
     */

    function pushRevision(
        bytes32 _spaceId,
        bytes32 _contentHash,
        uint _parentRevision,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.preparePushRevision(
                _spaceId,
                _contentHash,
                _parentRevision,
                _nonce
            ),
            _signature,
            _nonce
        );

        return doPushRevision(_spaceId, _contentHash, _parentRevision, signer);
    }

    /**
     *  [DIRECT-TX] pushRevision
     *  @dev transaction function for pushing a revision without middle-man
    *  @param _spaceId the space that the revision is to be pushed to
     *  @param _contentHash the ipfs hash of the revision content
     *  @param _parentRevision the parent of this new revision
     *  @return bool upon successful tx
     */

    function pushRevision(
        bytes32 _spaceId,
        bytes32 _contentHash,
        uint _parentRevision
    ) external returns (bool) {
        return doPushRevision(_spaceId, _contentHash, _parentRevision, msg.sender);
    }

    //////////////////////////////////////////////////
    // APPROVE REVISION
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] prepareApproveRevision
     *  @dev view function to prepare meta-tx for approving a revision
     *  @param _spaceId the space of the revision
     *  @param _revisionId the revision id
     *  @param _contentHash the ipfs content hash of the revision that is being approved
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bytes32 hash to be signed by tx sender
     */

    function prepareApproveRevision(
        bytes32 _spaceId,
        uint _revisionId,
        bytes32 _contentHash,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this),
                "approveRevision",
                _spaceId,
                _revisionId,
                _contentHash,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] approveRevision
     *  @dev transaction function for approving a new revision with relayer acting as middle-man
     *  @dev tx sender is recovered from signature of prepareApproveRevision result
     *  @param _spaceId the space of the revision
     *  @param _revisionId the revision id
     *  @param _contentHash the ipfs content hash of the revision that is being approved
     *  @param _signature signature of signed msg hash from prepareApproveRevision
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bool upon successful tx
     */

    function approveRevision(
        bytes32 _spaceId,
        uint _revisionId,
        bytes32 _contentHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareApproveRevision(
                _spaceId,
                _revisionId,
                _contentHash,
                _nonce
            ),
            _signature,
            _nonce
        );

        return doApproveRevision(_spaceId, _revisionId, _contentHash, signer);
    }

    /**
     *  [DIRECT-TX] approveRevision
     *  @dev transaction function for approving a revision without middle-man
     *  @param _spaceId the space of the revision
     *  @param _revisionId the revision id
     *  @param _contentHash the ipfs content hash of the revision that is being approved
     *  @return bool upon successful tx
     */

    function approveRevision(
        bytes32 _spaceId,
        uint _revisionId,
        bytes32 _contentHash
    ) external returns (bool) {
        return doApproveRevision(_spaceId, _revisionId, _contentHash, msg.sender);
    }

    //////////////////////////////////////////////////
    // REJECT REVISION
    //////////////////////////////////////////////////

    /**
     *  [META-TX PREPARE] rejectRevision
     *  @dev view function to prepare meta-tx for rejecting a revision
     *  @param _spaceId the space of the revision
     *  @param _revisionId the revision id
     *  @param _contentHash the ipfs content hash of the revision that is being rejected
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bytes32 hash to be signed by tx sender
     */

    function prepareRejectRevision(
        bytes32 _spaceId,
        uint _revisionId,
        bytes32 _contentHash,
        uint256 _nonce
    )
        external
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                address(this),
                "rejectRevision",
                _spaceId,
                _revisionId,
                _contentHash,
                _nonce
            )
        );
    }

    /**
     *  [META-TX] rejectRevision
     *  @dev transaction function for rejecting a new revision with relayer acting as middle-man
     *  @dev tx sender is recovered from signature of prepareRejectRevision result
     *  @param _spaceId the space of the revision
     *  @param _revisionId the revision id
     *  @param _contentHash the ipfs content hash of the revision that is being rejected
     *  @param _signature signature of signed msg hash from prepareRejectRevision
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return bool upon successful tx
     */

    function rejectRevision(
        bytes32 _spaceId,
        uint _revisionId,
        bytes32 _contentHash,
        bytes calldata _signature,
        uint256 _nonce
    )
        external
        returns (bool)
    {
        address signer = getSigner(
            this.prepareRejectRevision(
                _spaceId,
                _revisionId,
                _contentHash,
                _nonce
            ),
            _signature,
            _nonce
        );

        return doRejectRevision(_spaceId, _revisionId, _contentHash, signer);
    }

    /**
     *  [DIRECT-TX] rejectRevision
     *  @dev transaction function for rejecting a revision without middle-man
     *  @param _spaceId the space of the revision
     *  @param _revisionId the revision id
     *  @param _contentHash the ipfs content hash of the revision that is being rejected
     *  @return bool upon successful tx
     */

    function rejectRevision(
        bytes32 _spaceId,
        uint _revisionId,
        bytes32 _contentHash
    ) external returns (bool) {
        return doRejectRevision(_spaceId, _revisionId, _contentHash, msg.sender);
    }

    //////////////////////////////////////////////////
    // GET_NONCE
    //////////////////////////////////////////////////

    /**
     *  GET NONCE
     *  @dev get incrementable nonce of address passed to function
     *  @param _sender address to retrieve nonce from
     *  @return uint256 nonce of address
     */

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

    /**
     *  GET SIGNER
     *  @dev retrieve signer of a msg using signature and nonce
     *  @param _msg to recover (usually built with a prepare view function)
     *  @param _signature signature of transaction sender
     *  @param _nonce incrementable nonce used to prevent replay attacks
     *  @return address address of signer
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
     *  RECOVER SIGNATURE
     *  @dev splits signature into r,s,v vars and uses ecrecover on hash and signature
     *  @param _hash hash to use in ecrecover function
     *  @param _signature signature of transaction sender
     *  @return address address of signer
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

    /**
     *  PREFIX MESSAGE
     *  @dev prefix message with Ethereum Signed Message prefix
     *  @dev below message is prefixed when using JSON RPC eth.sign call
     *  @param _hash hash to add the prefix to
     *  @return bytes32 prefixed hash for recovery purposes
     */

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
