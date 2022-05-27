// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IIncomeContractUBILinear {
    function init(
        address token_,
        address community_,
        string memory ubiRoleName_,
        uint256 ubiQuantity_, 
        uint256 ubiPeriod_
    ) external;
}