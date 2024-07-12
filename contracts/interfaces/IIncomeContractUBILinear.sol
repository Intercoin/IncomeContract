// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IIncomeContractUBILinear {
    function init(
        address token_,
        address community_,
        uint8 ubiRole_,
        uint256 ubiQuantity_, 
        uint256 ubiPeriod_,
        address costManager_,
        address producedBy_
    ) external;
}