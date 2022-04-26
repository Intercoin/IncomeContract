// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "./base/IncomeContractUBILinearBase.sol";

contract IncomeContractUBILinear is IncomeContractUBILinearBase {
    
    /**
     * @param token_ token address of eth
     * @param community_ address of community contract
     * @param ubiRoleName_ role of EOA which can obtain ubi
     * @param ubiQuantity_ ubi's amount for period `ubiPeriod_`
     * @param ubiPeriod_ period for `ubiQuantity_`
     */
    function init(
        address token_,
        ICommunity community_,
        string memory ubiRoleName_,
        uint256 ubiQuantity_, 
        uint256 ubiPeriod_
    )
        public 
        initializer 
    {
        __IncomeContractUBILinearBase_init(token_, community_, ubiRoleName_, ubiQuantity_, ubiPeriod_);
    }

    
}