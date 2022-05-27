// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IIncomeContractUBI {
    function init(
        address token, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        address community,
        string memory roleName,
        string memory ubiRoleName
    ) external;
}