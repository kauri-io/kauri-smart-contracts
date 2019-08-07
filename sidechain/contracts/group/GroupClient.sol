pragma solidity 0.5.6;

import './GroupConnector.sol';
import '../permissions/Administrable.sol';

/**
 * @title Kauri GroupClient Smart Contract
 * @author kauri@consensys.net
 * @dev to be used by other smart contracts that interact with the group contract
 */

contract GroupClient is Administrable {
    GroupLogic groupContract;

    function setGroupContractAddress(
        address _groupContractAddress
    ) onlyAdmin(11001) external returns (bool) {
        groupContract = GroupConnector(_groupContractAddress);
    }

    function isMember(
        uint256 _groupId, 
        address _addr
    ) internal view returns (bool) {
        return groupContract.getRole(_groupId, _addr) > 0;
    }
}