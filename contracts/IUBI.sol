// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

interface IUBI {
    function setRatio(bytes32 tag, uint256 ratio) external;
    function setRatio(bytes32[] calldata tags, uint256[] calldata ratios) external;
    function setAvgPrice(bytes32 tag, uint256 price) external;
    function setAvgPrice(bytes32[] calldata tags, uint256[] calldata prices) external;
    
    function checkUBI() external view returns(uint256);
    function claimUBI() external;

}