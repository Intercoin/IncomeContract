pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "../IUBI.sol";
import "../lib/StringUtils.sol";

contract SomeExternalContractMock {
    
    using StringUtils for string;
    
    IUBI addrContract;
    constructor(
        IUBI addr
    )
        public
    {
        addrContract = addr;
    }
    

    // function setRatio(bytes32[] calldata tags, uint256[] calldata ratios) external;
    // function setAvgPrice(bytes32[] calldata tags, uint256[] calldata prices) external;
    
    function setRatio(string memory tag, uint256 ratio) public {
        bytes32 tagBytes32 = tag.stringToBytes32();
        addrContract.setRatio(tagBytes32, ratio);
    }
    function setAvgPrice(string memory tag, uint256 price) public {
        bytes32 tagBytes32 = tag.stringToBytes32();
        addrContract.setAvgPrice(tagBytes32, price);
    }
   
}