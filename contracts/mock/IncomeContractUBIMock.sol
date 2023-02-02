// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../IncomeContractUBI.sol";
import "../lib/StringUtils.sol";

contract IncomeContractUBIMock is IncomeContractUBI {
    using StringUtils for string;
   
    // function getTest() public view returns(uint256){
    //      return
    //             uint256(
    //                 int256(465552789000).div(int256(multiplier))
    //             ).mul(uint256(2000000000000000000));
    // }
    // function getTest2() public view returns(uint256){
    //      return uint256(465552789000).div(uint256(multiplier)).mul(uint256(2000000000000000000));
    // }
    // function getTest3() public view returns(uint256){
    //      return uint256(465552789000).mul(uint256(2000000000000000000)).div(uint256(multiplier));
    // }
    
    // function getTest222() public view returns(uint256){
    //      return uint256(100000000000000000000).mul(uint256(465552789000)).div(uint256(multiplier)).mul(uint256(2000000000000000000)).div(uint256(100000000000000000000));
    // }
    // function getTest333() public view returns(uint256){
    //      return uint256(100000000000000000000).mul(uint256(465552789000)).mul(uint256(2000000000000000000)).div(uint256(multiplier)).div(uint256(100000000000000000000));
    // }
    
    // // 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2
    // function getUBIValue(uint256 startDateIndex) public view returns(uint256) {
    //     return UBIValues[startDateIndex];
    // }
    // function getStartDateIndex() public view returns(uint256) {
    //     return getCurrentDateIndex();
    // } 
    
    // function getRatioData(string memory tag) public view returns(RatioStruct memory) {
    //     bytes32 tagBytes32 = tag.stringToBytes32();
    //     return ratiosData[tagBytes32];
    // }
    
    // function getAvgPrices(string memory tag, uint256 startDateIndex) public view returns(uint256) {
    //     bytes32 tagBytes32 = tag.stringToBytes32();
    //     return avgPrices[tagBytes32][startDateIndex];
    // }
    
    
}