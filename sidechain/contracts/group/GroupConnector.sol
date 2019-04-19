pragma solidity 0.5.6;

import './GroupLogic.sol';
import './GroupI.sol';

/**
 * GroupConnector defines the entrypoint of the system and only contains public methods reachable from outside
 */
contract GroupConnector is GroupI, GroupLogic {

  mapping(address => uint256) public nonces;

  //////////////////////////////////////////////////////////////////
  // CREATE_GROUP
  //////////////////////////////////////////////////////////////////

  /**
   * [META-TX] prepareCreateGroup
   * View function that generates a unique method call message for `createGroup` in order to be signed and sent to a relayer so we can identify the original sender using ecrecover
   */
  function prepareCreateGroup(
      bytes32 _metadataLocator,
      bytes32[] calldata _secretHashes,
      uint8[] calldata _assignedRoles,
      uint256 _nonce
  )
      external
      view
      returns (bytes32) {

      // Generate unique method call message
      return keccak256(
          abi.encodePacked(
              address(this),
              "createGroup",
              _metadataLocator,
              _secretHashes, // TODO make sure we can pass an array to abi.encodePacked
              _assignedRoles, // TODO make sure we can pass an array to abi.encodePacked
              _nonce
              )
          );
  }

  /**
   * [META-TX] createGroup
   * Transaction function to create a group where the transaction sender only acts as a middle-man (meta-tx) and the original sender is recovered from the signature
   */
  function createGroup(
      bytes32 _metadataLocator,
      bytes32[] calldata _secretHashes,
      uint8[] calldata _assignedRoles,
      bytes calldata _signature,
      uint256 _nonce
  )
      external
      returns (bool) {

      // Recover the original sender from the signature
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

      // Call the logic
      createGroup(signer, _metadataLocator, _secretHashes, _assignedRoles);
  }

  /**
   * [DIRECT] createGroup
   * Transaction function to create a group where there is no middle-man (transaction sender = original sender)
   */
  function createGroup(
      bytes32 _metadataLocator,
      bytes32[] calldata _secretHashes,
      uint8[] calldata _assignedRoles
  )
      external
      returns (bool) {

      // Call the logic
      createGroup(msg.sender, _metadataLocator, _secretHashes, _assignedRoles);

  }



  //////////////////////////////////////////////////////////////////
  // INVITATION
  //////////////////////////////////////////////////////////////////

  /**
   * [META-TX] prepareInvitation
   * View function that generates a unique method call message for `storeInvitation` in order to be signed and sent to a relayer so we can identify the original sender using ecrecover
   */
  function prepareInvitation(
      uint256 _groupId,
      uint8   _role,
      bytes32 _secretHash,
      uint256 _nonce
  )
    external
    view
    returns (bytes32) {

    // Generate unique method call message
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
   * [META-TX] storeInvitation
   * Transaction function to store an invitation where the transaction sender only acts as a middle-man (meta-tx relayer) and the original sender is recovered from the signature
   */
  function storeInvitation(
      uint256 _groupId,
      uint8   _role,
      bytes32 _secretHash,
      bytes calldata _signature,
      uint256 _nonce
  )
      external
      returns (bool) {

      // Recover the original sender from the signature
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

      // Call the logic
      storeInvitation(signer, _groupId, _role, _secretHash);

    }

  /**
   * [DIRECT] storeInvitation
   * Transaction function to store an invitation where there is no middle-man (transaction sender = original sender)
   */
  function storeInvitation(
      uint256 _groupId,
      uint8   _role,
      bytes32 _secretHash
    )
      external
      returns (bool) {

      // Call the logic
      storeInvitation(msg.sender, _groupId, _role, _secretHash);
    }




    //////////////////////////////////////////////////////////////////
    // NONCE
    //////////////////////////////////////////////////////////////////

    function getNonce(
        address _sender
    )
        public
        view
        returns (uint256)
    {
        return nonces[_sender];
    }



    //////////////////////////////////////////////////////////////////
    // UTILS
    //////////////////////////////////////////////////////////////////

    // getSigner (from Group.sol, need to move into folder)
    function getSigner(
        bytes32 _msg,
        bytes memory _signature,
        uint256 _nonce
    )
        internal
        returns (address)
    {
        address signer = recoverSignature(_msg, _signature);

        uint256 nonce = nonces[signer];

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
