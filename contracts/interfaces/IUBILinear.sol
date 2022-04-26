// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

interface IUBILinear {

    function checkUBI() external view returns(uint256);
    function claimUBI() external;

}