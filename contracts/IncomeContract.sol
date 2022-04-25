// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./base/IncomeContractBase.sol";

contract IncomeContract is IncomeContractBase {

    function init(
        address token // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
    ) 
        public 
        initializer 
    {
        __IncomeContract_init(token);
    }
    
}