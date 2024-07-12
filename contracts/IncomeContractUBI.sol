// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./base/IncomeContractUBIBase.sol";
import "./interfaces/IIncomeContractUBI.sol";

contract IncomeContractUBI is IncomeContractUBIBase, IIncomeContractUBI {
    
    /**
     * @param token  token address of eth
     * @param community address of community contract
     * @param role role of contracts who can send stats of prices and ratios
     * @param ubiRole role of EOA which can obtain ubi
     * @param costManager costManager address
     * @param producedBy producedBy address
     */
    function init(
        address token, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        address community,
        uint8 role,
        uint8 ubiRole,
        address costManager,
        address producedBy
    )
        external 
        initializer 
    {
        __IncomeContractUBI_init(token, community, role, ubiRole, costManager, producedBy);
    }

    
}