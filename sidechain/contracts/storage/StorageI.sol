pragma solidity ^0.5.6;

contract StorageI {
    
    function getUintValue(bytes32 key)
    public 
    view 
    returns(uint);

    function getTwoUintValues(bytes32 key1, bytes32 key2) 
            public view returns(uint, uint);

    function getThreeUintValues(bytes32 key1, bytes32 key2, bytes32 key3) 
            public view returns(uint, uint, uint);

    function getFourUintValues(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4) 
            public view returns(uint, uint, uint, uint);

    function getFiveUintValues(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4, bytes32 key5) 
            public view returns(uint, uint, uint, uint, uint);

    function putUintValue(bytes32 key, uint value) public ;

    function incrementUintValue(bytes32 key, uint amount) public returns(uint);

    function decrementUintValue(bytes32 key, uint amount) public returns(uint);

    function getBytes32Value(bytes32 key) public view returns(bytes32);

    function getTwoBytes32Values(bytes32 key1, bytes32 key2) 
            public view returns(bytes32, bytes32);

    function getThreeBytes32Values(bytes32 key1, bytes32 key2, bytes32 key3) 
            public view returns(bytes32, bytes32, bytes32);

    function getFourBytes32Values(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4) 
            public view returns(bytes32, bytes32, bytes32, bytes32);

    function getFiveBytes32Values(bytes32 key1, bytes32 key2, bytes32 key3, bytes32 key4, bytes32 key5) 
            public view returns(bytes32, bytes32, bytes32, bytes32, bytes32);

    function putBytes32Value(bytes32 key, bytes32 value) public;

    function getAddressValue(bytes32 key) public view returns(address);

    function putAddressValue(bytes32 key, address value) public;

    function getBooleanValue(bytes32 key) public view returns(bool);

    function putBooleanValue(bytes32 key, bool value) public;

    function putBundleAValues(bytes32 key, address value1, uint64 value2, uint32 value3) public;

    function getBundleAValues(bytes32 key) public view returns (address, uint64, uint32);

    function setBundleAValue1(bytes32 key, address value) public;

    function setBundleAValue2(bytes32 key, uint64 value) public;

    function setBundleAValue3(bytes32 key, uint32 value) public;
}
