pragma solidity ^0.5.6;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './StorageI.sol';
import '../permissions/Permissioned.sol';

contract Storage is StorageI, Permissioned {

    using SafeMath for uint;

    mapping(bytes32 => uint) public uintValues;

    function getUintValue(bytes32 key) 
        public 
        view 
        returns(uint) 
    {
        return uintValues[key];
    }

    function getTwoUintValues(bytes32 key1, bytes32 key2) 
        public 
        view 
        returns(uint, uint) 
    {
        return (getUintValue(key1), getUintValue(key2));
    }

    function getThreeUintValues(bytes32 key1, bytes32 key2, bytes32 key3) 
        public 
        view 
        returns(uint, uint, uint) 
    {
        return (getUintValue(key1), getUintValue(key2), getUintValue(key3));
    }

    function getFourUintValues(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4) 
        public 
        view 
        returns(uint, uint, uint, uint) 
    {
        return (getUintValue(key1), getUintValue(key2), getUintValue(key3), getUintValue(key4));
    }

    function getFiveUintValues(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4, bytes32 key5) 
        public 
        view 
        returns(uint, uint, uint, uint, uint) 
    {
        return (getUintValue(key1), getUintValue(key2), getUintValue(key3), getUintValue(key4), getUintValue(key5));
    }

    function putUintValue(bytes32 key, uint value) 
        public 
    {
        uintValues[key] = value;
    }

    function incrementUintValue(bytes32 key, uint amount) 
        public 
        // hasWriteAccess 
        returns(uint) 
    {
        uintValues[key] = uintValues[key].add(amount);
        return uintValues[key];
    }

    function decrementUintValue(bytes32 key, uint amount) 
        public 
        // hasWriteAccess 
        returns(uint) 
    {
        uintValues[key] = uintValues[key].sub(amount);
        return uintValues[key];
    }

    mapping(bytes32 => bytes32) public bytes32Values;

    function getBytes32Value(bytes32 key) 
        public 
        view 
        returns(bytes32) 
    {
        return bytes32Values[key];
    }

    function getTwoBytes32Values(bytes32 key1, bytes32 key2) 
        public 
        view 
        returns(bytes32, bytes32) 
    {
        return (getBytes32Value(key1), getBytes32Value(key2));
    }

    function getThreeBytes32Values(bytes32 key1, bytes32 key2, bytes32 key3) 
        public 
        view 
        returns(bytes32, bytes32, bytes32) {
        return (getBytes32Value(key1), getBytes32Value(key2), getBytes32Value(key3));
    }

    function getFourBytes32Values(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4) 
        public view returns(bytes32, bytes32, bytes32, bytes32) {
        return (getBytes32Value(key1), getBytes32Value(key2), getBytes32Value(key3), getBytes32Value(key4));
    }

    function getFiveBytes32Values(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4, bytes32 key5) 
        public 
        view 
        returns(bytes32, bytes32, bytes32, bytes32, bytes32) 
    {
        return (getBytes32Value(key1), getBytes32Value(key2), getBytes32Value(key3), getBytes32Value(key4), getBytes32Value(key5));
    }

    function putBytes32Value(bytes32 key, bytes32 value) 
        public 
        // hasWriteAccess 
    {
        bytes32Values[key] = value;
    }

    mapping(bytes32 => address) public addressValues;

    function getAddressValue(bytes32 key) 
        public 
        view 
        returns(address) 
    {
        return addressValues[key];
    }

    function putAddressValue(bytes32 key, address value) 
        public 
        // hasWriteAccess 
    {
        addressValues[key] = value;
    }

    mapping(bytes32 => bool) public booleanValues;

    function getBooleanValue(bytes32 key) 
        public view returns(bool) {
        return booleanValues[key];
    }

    function putBooleanValue(bytes32 key, bool value) 
        public 
        // hasWriteAccess 
    {
        booleanValues[key] = value;
    }

    //32 bytes
    struct BundleA {
        address value1;
        uint64 value2;
        uint32 value3;
    } 

    mapping(bytes32 => BundleA) public bundleAValues;

    function putBundleAValues(bytes32 key, address value1, uint64 value2, uint32 value3) 
        public 
        // hasWriteAccess 
    {
        bundleAValues[key] = BundleA(value1, value2, value3);
    }

    function getBundleAValues(bytes32 key) 
        public 
        view 
        returns (address, uint64, uint32) 
    {
        return (bundleAValues[key].value1,
                bundleAValues[key].value2,
                bundleAValues[key].value3);
    }

    function setBundleAValue1(bytes32 key, address value) 
        public 
        // hasWriteAccess 
    {
        bundleAValues[key].value1 = value;
    }

    function setBundleAValue2(bytes32 key, uint64 value) 
        public 
        // hasWriteAccess 
    {
        bundleAValues[key].value2 = value;
    }

    function setBundleAValue3(bytes32 key, uint32 value) 
        public 
        // hasWriteAccess 
    {
        bundleAValues[key].value3 = value;
    }

}
