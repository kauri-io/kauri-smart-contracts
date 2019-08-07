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
