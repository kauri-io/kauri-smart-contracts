pragma solidity ^0.4.24;

contract Fundable {
  function() public payable;
  
  function addAvailableFunds(address _accountAddress, uint _amount) external;

  function deductAvailableFunds(address _accountAddress, uint _amount) external;

  function getAvailableFunds(address _account) external constant returns(uint);
}