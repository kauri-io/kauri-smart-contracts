pragma solidity ^0.4.24;

import './AdminController.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract Administrable is AdminController, Ownable {
    
    AdminController public remoteAdminController;

    function canAdminister(uint functionCode, address caller) public returns(bool) {
        return remoteAdminController.canAdminister(functionCode, caller);
    }

    function setAdminController(address adminControllerAddress) 
                                external 
                                controllerAddressSet(adminControllerAddress) {
        if (address(remoteAdminController) != 0) {
            require(canAdminister(1001, msg.sender));
        } else {
            require(owner == msg.sender);
        }

        remoteAdminController = AdminController(adminControllerAddress);
    }

    modifier onlyAdmin(uint functionCode) {
        require(canAdminister(functionCode, msg.sender));
        _;
    }

    modifier controllerAddressSet(address adminControllerAddress) {
        require(adminControllerAddress != 0);
        _;
    }
}