// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../IncomeContract.sol";


contract IncomeContractMock is IncomeContract {
   
    // 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2
    function testClaim(address recipient, uint256 amount) public returns(bool success) {
        address payable addr = payable(recipient);
        success = addr.send(amount);
    }
    
}