// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./base/IncomeContractBase.sol";
import "./interfaces/IIncomeContract.sol";

contract IncomeContract is IncomeContractBase, IIncomeContract {
    /**
     * 
     * @param token token
     * @param costManager costManager address
     * @param producedBy producedBy address
     */
    function init(
        address token, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        address costManager,
        address producedBy
    ) 
        external 
        initializer 
    {
        __IncomeContract_init(token, costManager, producedBy);
    }
    
}