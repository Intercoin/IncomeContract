// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./base/IncomeContractUBIBase.sol";

contract IncomeContractUBI is IncomeContractUBIBase {
    
    /**
     * @param token  token address of eth
     * @param community address of community contract
     * @param roleName role of contracts who can send stats of prices and ratios
     * @param ubiRoleName role of EOA which can obtain ubi
     */
    function init(
        address token, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        ICommunity community,
        string memory roleName,
        string memory ubiRoleName
    )
        public 
        initializer 
    {
        __IncomeContractUBI_init(token, community, roleName, ubiRoleName);
    }

    
}