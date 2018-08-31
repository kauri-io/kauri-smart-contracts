pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import '../common/UsingExternalStorage.sol';
import './CommunityI.sol';

/**
 * @title Community
 * @author Craig Williams - <craig.williams@consensys.net>
 * @dev A smart contract that handles community management tasks
 */
contract Community is CommunityI, UsingExternalStorage {

    using SafeMath for uint;

    string constant COMMUNITY_KEY = "community";
    string constant CURATOR_KEY = "curator";
    string constant ADMIN_KEY = "admin";

    enum MemberStatus {
        NULL,
        ENABLED,
        DISABLED
    }

    enum CommunityStatus {
        NULL, 
        ENABLED
    }

    enum MemberRole {
        CURATOR,
        ADMIN
    }

    /**
     * @dev Creates a community with the specified id and metadata.
     * @dev Adds initial admins and curators.
     *
     * @dev Reverts if: 
     * @dev     - the admins list is empty
     * @dev     - a community with the specified id already exists
     *
     * @param _communityId the id of the community to be created
     * @param _admins a list of initial admins
     * @param _curators a list of initial curators
     * @param _metadataLocator the locator for metadata information for the community
     */
    function createCommunity(bytes32 _communityId, 
                             address[] _admins, 
                             address[] _curators, 
                             bytes32 _metadataLocator) 
                             external 
                             containsValue(_admins) {
        uint existingCommunityStatus = storageContract.getUintValue(keccak256(COMMUNITY_KEY, _communityId));
        require(existingCommunityStatus == 0);

        storageContract.putUintValue(keccak256(COMMUNITY_KEY, _communityId), uint(CommunityStatus.ENABLED));

        CommunityCreated(_communityId, _metadataLocator);

        for (uint i = 0; i < _admins.length; i++) {
            doAddAdmin(_communityId, _admins[i]);
        }

        for (i = 0; i < _curators.length; i++) {
            doAddCurator(_communityId, _curators[i]);
        }
    }

    /**
     * @dev Called by a community admin in order to add an additional admin for a community.
     *
     * @dev Reverts if: 
     * @dev     - the message sender is not an
     * @dev     - the moderator address is blank (zero)
     *
     * @param _communityId the communitu for which the admin is to be assigned
     * @param _adminAddress the admin address
     */
    function addAdmin(bytes32 _communityId, 
                      address _adminAddress) 
                      external 
                      onlyCommunityAdmin(_communityId)
                      isValidAddress(_adminAddress) {
        doAddAdmin(_communityId, _adminAddress);
    }

    function doAddAdmin(bytes32 _communityId, address _adminAddress) private {
        storageContract.putUintValue(keccak256(ADMIN_KEY, _communityId, _adminAddress), uint(MemberStatus.ENABLED));
        MemberEnabled(_adminAddress, _communityId, MemberRole.ADMIN);
    }

    /**
     * @dev Called by a community admin in order to add a curator for a community.
     *
     * @dev Reverts if: 
     * @dev     - the message sender is not a community admin
     * @dev     - the curator address is blank (zero)
     *
     * @param _communityId the community id for which the curator is to be assigned
     * @param _curatorAddress the curator address
     */
    function addCurator(bytes32 _communityId, 
                        address _curatorAddress) 
                        external 
                        onlyCommunityAdmin(_communityId)
                        isValidAddress(_curatorAddress) {
        doAddCurator(_communityId, _curatorAddress);
    }

    function doAddCurator(bytes32 _communityId, address _curatorAddress) private {
        storageContract.putUintValue(keccak256(CURATOR_KEY, _communityId, _curatorAddress), uint(MemberStatus.ENABLED));
        
        MemberEnabled(_curatorAddress, _communityId, MemberRole.CURATOR);
    }

    /**
     * @dev Called by a community admin in order to disable a admin for a community.
     *
     * @dev Reverts if: 
     * @dev     - the message sender is not a community admin
     * @dev     - the admin address is blank (zero)
     *
     * @param _communityId the community id for which the curator is to be disabled
     * @param _adminAddress the admin address
     */
    function disableAdmin(bytes32 _communityId, 
                               address _adminAddress) 
                               external 
                               onlyCommunityAdmin(_communityId)
                               isValidAddress(_adminAddress) {
        storageContract.putUintValue(keccak256(ADMIN_KEY, _communityId, _adminAddress), uint(MemberStatus.DISABLED));
        
        MemberDisabled(_adminAddress, _communityId, MemberRole.ADMIN);
    }

    /**
     * @dev Called by a community admin in order to deativate a curator for a community.
     *
     * @dev Reverts if: 
     * @dev     - the message sender is not a community admin
     * @dev     - the curator address is blank (zero)
     *
     * @param _communityId the community id for which the curator is to be deactivated
     * @param _curatorAddress the curator address
     */
    function disableCurator(bytes32 _communityId, 
                               address _curatorAddress) 
                               external 
                               onlyCommunityAdmin(_communityId)
                               isValidAddress(_curatorAddress) {
        storageContract.putUintValue(keccak256(CURATOR_KEY, _communityId, _curatorAddress), uint(MemberStatus.DISABLED));

        MemberDisabled(_curatorAddress, _communityId, MemberRole.CURATOR);
    }

    /**
     * @dev Checks if a specified address is an active curator for a community.
     *
     * @param _communityId the community to check
     * @param _potentialCuratorAddress the potential curator address
     *
     * @return true if the address is a curator for the community, false otherwise
     */
    function isCurator(bytes32 _communityId, address _potentialCuratorAddress) public constant returns(bool) {
        return getCuratorStatus(_communityId, _potentialCuratorAddress) == MemberStatus.ENABLED;
    }

    /**
     * @dev Checks if a specified address is an active admin for a topic.
     *
     * @param _communityId the community to check
     * @param _potentialAdminAddress the potential admin address
     *
     * @return true if the address is a admin for the community, false otherwise
     */
    function isAdmin(bytes32 _communityId, address _potentialAdminAddress) public constant returns(bool) {
        return getAdminStatus(_communityId, _potentialAdminAddress) == MemberStatus.ENABLED;
    }

    function getCuratorStatus(bytes32 _communityId, address _curator) private view returns(MemberStatus) {
        return MemberStatus(storageContract.getUintValue(keccak256(CURATOR_KEY, _communityId, _curator)));
    }

    function getAdminStatus(bytes32 _communityId, address _admin) private view returns(MemberStatus) {
        return MemberStatus(storageContract.getUintValue(keccak256(ADMIN_KEY, _communityId, _admin)));
    }

    function generateCommunityId(bytes32 _metadataLocator, uint _salt) private view returns (bytes32) {
        return keccak256(_metadataLocator, block.timestamp, block.number);
    }

    modifier isValidAddress(address _anAddress) {
        require(_anAddress > 0);
        _;
    }

    modifier containsValue(address[] addresses) {
        require(addresses.length > 0);
        _;
    }

    modifier onlyCommunityAdmin(bytes32 _communityId) {
        require(isAdmin(_communityId, msg.sender));
        _;
    }

    event CommunityCreated(bytes32 indexed communityId, bytes32 metadataLocator);

    event MemberEnabled(address indexed member, bytes32 indexed communityId, MemberRole indexed role); 

    event MemberDisabled(address indexed member, bytes32 indexed communityId, MemberRole indexed role);
}