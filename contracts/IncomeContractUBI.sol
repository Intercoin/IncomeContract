// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "./openzeppelin-contracts/contracts/math/SignedSafeMath.sol";
import "./openzeppelin-contracts/contracts/math/SafeMath.sol";
import "./openzeppelin-contracts/contracts/utils/EnumerableSet.sol";
// import "./openzeppelin-contracts/contracts/access/Ownable.sol";
// import "./lib/StringUtils.sol";
// import "./openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
// import "./openzeppelin-contracts/contracts/utils/Address.sol";
import "./DateTime.sol";

import "./IUBI.sol";
import "./ICommunity.sol";

import "./IncomeContract.sol";

contract IncomeContractUBI is IUBI, DateTime, IncomeContract {
    
    ICommunity private communityAddress;
    string private communityRole;
    string private communityUBIRole;
    
    uint256 constant sampleSize = 10;
    uint256 constant multiplier = 1e6;
    
    using SafeMath for uint256;
    using SignedSafeMath for uint256;
    using SignedSafeMath for int256;
    
    
    uint256 private startDateIndex;
    
    
    uint256 private tagsIndex = 1;
    mapping (bytes32 => uint256) internal _tags;
    mapping (uint256 => bytes32) internal _tagsIndices;
    
    
    struct RatioStruct {
        int256 count;
        int256 total;
        int256 average;
        //int256 median;
        //int256 variance;
        int256 prevRatio;
        bool alreadyInit;
    }
    
    mapping(bytes32 => RatioStruct) ratiosData;
    
    //      tagname            dayTs       price
    mapping(bytes32 => mapping(uint256 => uint256)) avgPrices;
        
    //      dayTs       ubi
    mapping(uint256 => uint256) UBIValues;
    
    struct UBIStruct {
        uint256 lastIndex;
        uint256 payed;
        uint256 total;
        uint256 prevUBI;
        bool exists;
    }
    mapping(address => UBIStruct) users;
    
    modifier canRecord() {
        bool s = _canRecord(communityRole);
        
        require(s == true, "Sender has not in accessible List");
        _;
    }
    modifier canObtainUBI() {
        bool s = _canRecord(communityUBIRole);
        
        require(s == true, "Sender has not in accessible List");
        _;
    }
   
    
    /**
     * @param community address of community contract
     * @param roleName role of contracts who can send stats of prices and ratios
     * @param ubiRoleName role of EOA which can obtain ubi
     */
    constructor(
        address token, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        ICommunity community,
        string memory roleName,
        string memory ubiRoleName
    )
        public
        IncomeContract(token)
    {
        communityAddress = community;
        communityRole = roleName;
        communityUBIRole = ubiRoleName;
        
        startDateIndex = getCurrentDateIndex();
    }
    
    function getRatioMultiplier() public view returns(uint256) {
        return multiplier;
    }
    // calling by voting
    function setRatio(
        bytes32 tag, 
        uint256 ratio
    ) 
        canRecord() 
        external 
        override 
    {
        createTag(tag);
        _record(tag,int256(ratio));
        
        uint256 dateIndex = getCurrentDateIndex();
        
        setUBI(dateIndex);
        
    }
    
    function setRatio(
        bytes32[] calldata tags, 
        uint256[] calldata ratios
    ) 
        canRecord() 
        external 
        override 
    {
        uint256 dateIndex = getCurrentDateIndex();
        for (uint256 i=0; i<tags.length; i++) {
            createTag(tags[i]);
            _record(tags[i],int256(ratios[i]));
        }
        setUBI(dateIndex);
    }
    
    // calling by Prices
    function setAvgPrice(
        bytes32 tag, 
        uint256 price
    ) 
        canRecord() 
        external 
        override 
    {
        uint256 dateIndex = getCurrentDateIndex();
        createTag(tag);
        avgPrices[tag][dateIndex] = price;
        
        setUBI(dateIndex);
        
    }
    function setAvgPrice(
        bytes32[] calldata tags, 
        uint256[] calldata prices
    ) 
        canRecord() 
        external 
        override 
    {
        uint256 dateIndex = getCurrentDateIndex();
        for (uint256 i=0; i<tags.length; i++) {
            createTag(tags[i]);
            avgPrices[tags[i]][dateIndex] = prices[i];
        }
        setUBI(dateIndex);
    }

    function checkUBI(
    ) 
        public 
        view
        override 
        returns(uint256 ubi) 
    {
        uint256 lastIndex = users[msg.sender].lastIndex;
        uint256 payed = users[msg.sender].payed;
        uint256 total = users[msg.sender].total;
        uint256 prevUBI = users[msg.sender].prevUBI;
        
        if (users[msg.sender].exists == false) {
            lastIndex = startDateIndex;
        }
       
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);
        for (uint256 i=lastIndex; i<untilIndex; i=i+DAY_IN_SECONDS) {
            if (UBIValues[i] == 0) {
            } else {
               prevUBI = UBIValues[i];
            }
            total = total.add(prevUBI);
            lastIndex = i.add(DAY_IN_SECONDS);
            
        }
        ubi =  (total.sub(payed)).div(multiplier);

    }
    
    function claimUBI(
    ) 
        public 
        override 
        canObtainUBI()
    {
        _actualizeUBI();
        uint256 toPay = users[msg.sender].total.sub(users[msg.sender].payed);
        require(toPay.div(multiplier) > 0, 'Amount exceeds balance available to claim');
        users[msg.sender].payed = users[msg.sender].payed.add(toPay);
        bool success = _claim(msg.sender, toPay.div(multiplier));
        require(success == true, 'There are no enough funds at contract');
        
    }
    
    function _actualizeUBI(
    ) 
        internal 
        
        returns(uint256 ubi) 
    {
        if (users[msg.sender].exists == false) {
            users[msg.sender].lastIndex = startDateIndex;
            users[msg.sender].payed = 0;
            users[msg.sender].total = 0;
            users[msg.sender].prevUBI = 0;
            users[msg.sender].exists = true;
        }
        
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);
        for (uint256 i=users[msg.sender].lastIndex; i<untilIndex; i=i+DAY_IN_SECONDS) {
            if (UBIValues[i] == 0) {
            } else {
                users[msg.sender].prevUBI = UBIValues[i];
            }
            users[msg.sender].total = users[msg.sender].total.add(users[msg.sender].prevUBI);
            users[msg.sender].lastIndex = i.add(DAY_IN_SECONDS);
            
        }
        ubi =  (users[msg.sender].total.sub(users[msg.sender].payed)).div(multiplier);

    }
    
    function _canRecord(string memory roleName) private view returns(bool s){
        s = false;
        string[] memory roles = ICommunity(communityAddress).getRoles(msg.sender);
        for (uint256 i=0; i< roles.length; i++) {
            
            if (keccak256(abi.encodePacked(roleName)) == keccak256(abi.encodePacked(roles[i]))) {
                s = true;
            }
        }
    }
    
    function setUBI(
        uint256 dateIndex
    ) 
        private
    {
        // UBI = SUM over all tags of ( avgPrice[day] * avgFractionFromVote )
        
        uint256 ubi;
        for (uint256 i=0; i< tagsIndex; i++) {
            ubi = ubi.add(
                multiplier.mul(
                    uint256(ratiosData[_tagsIndices[i]].average).mul(avgPrices[_tagsIndices[i]][dateIndex]).div(multiplier)
                ).div(multiplier)
            );
            
        }
        UBIValues[dateIndex] = ubi;
    }
    
    function getCurrentDateIndex(
    ) 
        internal 
        view 
        returns(uint256 dateIndex) 
    {
        uint256 y = getYear(now);
        uint256 m = getMonth(now);
        uint256 d = getDay(now);
        dateIndex = toTimestamp(uint256(y),uint256(m),uint256(d));
    }
    
    function _record(
        bytes32 tagBytes32, 
        int256 ratio
    ) 
        private 
    {
        ratio = ratio.mul(int256(multiplier));
        
        ratiosData[tagBytes32].total = ratiosData[tagBytes32].total.add(ratio);
        
        if (ratiosData[tagBytes32].alreadyInit == false) {
            ratiosData[tagBytes32].alreadyInit = true;
            ratiosData[tagBytes32].count = 1;
            ratiosData[tagBytes32].average = ratio;
            ratiosData[tagBytes32].prevRatio = ratio;
        } else {
            ratiosData[tagBytes32].count = ratiosData[tagBytes32].count.add(1);
            //int256 oldAverage = ratiosData[tagBytes32].average;
            
            // https://stackoverflow.com/questions/10930732/c-efficiently-calculating-a-running-median/15150143#15150143
            // for each sample
            // average += ( sample - average ) * 0.1f; // rough running average.
            // median += _copysign( average * 0.01, sample - median );
            // but "0.1f" replace to "sampleSize"
            ratiosData[tagBytes32].average = ratiosData[tagBytes32].average.add(
                (
                    (
                        (int256(ratio)).sub(ratiosData[tagBytes32].average)
                    ).div(int256(sampleSize))
                )
            );
            
            ratiosData[tagBytes32].prevRatio = ratio;
            
            
        }
        
    }
    
    function createTag(bytes32 tag) private {
        if (_tags[tag] == 0) {
            _tags[tag] = tagsIndex;
            _tagsIndices[tagsIndex] = tag;
            tagsIndex = tagsIndex.add(1);
        }
       
    }
    
}