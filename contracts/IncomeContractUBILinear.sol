// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./base/IncomeContractUBILinearBase.sol";
import "./interfaces/IIncomeContractUBILinear.sol";

contract IncomeContractUBILinear is IncomeContractUBILinearBase, IIncomeContractUBILinear {
    
    /**
     * @param token_ token address of eth
     * @param community_ address of community contract
     * @param ubiRole_ role of EOA which can obtain ubi
     * @param ubiQuantity_ ubi's amount for period `ubiPeriod_`
     * @param ubiPeriod_ period for `ubiQuantity_`
     */
    function init(
        address token_,
        address community_,
        uint8 ubiRole_,
        uint256 ubiQuantity_, 
        uint256 ubiPeriod_
    )
        public 
        initializer 
    {
        __IncomeContractUBILinearBase_init(token_, community_, ubiRole_, ubiQuantity_, ubiPeriod_);
    }

    
}