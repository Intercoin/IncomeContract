// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../lib/DateTime.sol";

import "../interfaces/IUBI.sol";


import "../base/IncomeContractBase.sol";
import "./UBIBase.sol";

abstract contract IncomeContractUBIBase is IUBI, IncomeContractBase, UBIBase {
    
    
    uint8 internal communityStatsRole;
    
    uint256 constant sampleSize = 10;
    uint256 constant multiplier = 1e6;
    
    
    using DateTime for uint256;
    
    uint256 private startDateIndex;
    
    
    uint256 private tagsIndex;
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
        uint256 claimed;
        uint256 total;
        uint256 prevUBI;
        bool exists;
    }
    mapping(address => UBIStruct) users;
    

    function __IncomeContractUBI_init(
        address token, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        address communityAddress,
        uint8 statsRole,
        uint8 ubiRole,
        address costManager,
        address producedBy
    )  
        internal
        onlyInitializing
    {
        tagsIndex = 1;
        __IncomeContract_init(token, costManager, producedBy);
        __UBIBase_init(communityAddress, ubiRole); 
        communityStatsRole = statsRole;
        
        startDateIndex = getCurrentDateIndex();
       
    }

    function getRatioMultiplier() external pure returns(uint256) {
        return multiplier;
    }

    // calling by voting
    function setRatio(
        bytes32 tag, 
        uint256 ratio
    ) 
        external 
        override 
    {
        canRecord(_msgSender(), communityStatsRole);
        createTag(tag);
        _record(tag,int256(ratio));
        
        uint256 dateIndex = getCurrentDateIndex();
        
        setUBI(dateIndex);
        
    }
    
    function setRatio(
        bytes32[] calldata tags, 
        uint256[] calldata ratios
    ) 
        external 
        override 
    {
        canRecord(_msgSender(), communityStatsRole);
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
        external 
        override 
    {
        canRecord(_msgSender(), communityStatsRole);
        uint256 dateIndex = getCurrentDateIndex();
        createTag(tag);
        avgPrices[tag][dateIndex] = price;
        
        setUBI(dateIndex);
        
    }
    function setAvgPrice(
        bytes32[] calldata tags, 
        uint256[] calldata prices
    ) 
        external 
        override 
    {
        canRecord(_msgSender(), communityStatsRole);
        uint256 dateIndex = getCurrentDateIndex();
        for (uint256 i=0; i<tags.length; i++) {
            createTag(tags[i]);
            avgPrices[tags[i]][dateIndex] = prices[i];
        }
        setUBI(dateIndex);
    }

    function checkUBI(
    ) 
        external 
        view
        override 
        returns(uint256 ubi) 
    {   
        address sender = _msgSender();

        uint256 lastIndex = users[sender].lastIndex;
        uint256 claimed = users[sender].claimed;
        uint256 total = users[sender].total;
        uint256 prevUBI = users[sender].prevUBI;
        
        if (users[sender].exists == false) {
            lastIndex = startDateIndex;
        }
       
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);
        for (uint256 i=lastIndex; i<untilIndex; i=i+DateTime.DAY_IN_SECONDS) {
            if (UBIValues[i] == 0) {
            } else {
               prevUBI = UBIValues[i];
            }
            total = total + prevUBI;
            lastIndex = i + DateTime.DAY_IN_SECONDS;
            
        }
        ubi =  (total - claimed) / multiplier;

    }
    
    function claimUBI(
    ) 
        external 
        override 
    {

        address sender = _msgSender();
        canObtainUBI(sender);
        _actualizeUBI(sender);
        uint256 toPay = users[sender].total - users[sender].claimed;
        require(toPay / multiplier > 0, "Amount exceeds balance available to claim");
        users[sender].claimed = users[sender].claimed + toPay;
        bool success = _claim(sender, toPay / multiplier);
        require(success == true, "NOT_ENOUGH_FUNDS");
        
    }
    
    function _actualizeUBI(
        address account
    ) 
        internal 
        override
        returns(uint256 ubi) 
    {
        if (users[account].exists == false) {
            users[account].lastIndex = startDateIndex;
            users[account].claimed = 0;
            users[account].total = 0;
            users[account].prevUBI = 0;
            users[account].exists = true;
        }
        
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);
        for (uint256 i=users[account].lastIndex; i<untilIndex; i=i+DateTime.DAY_IN_SECONDS) {
            if (UBIValues[i] == 0) {
            } else {
                users[account].prevUBI = UBIValues[i];
            }
            users[account].total = users[account].total + users[account].prevUBI;
            users[account].lastIndex = i + DateTime.DAY_IN_SECONDS;
            
        }
        ubi =  (users[account].total - users[account].claimed) / multiplier;

    }
    
    
    function setUBI(
        uint256 dateIndex
    ) 
        private
    {
        // UBI = SUM over all tags of ( avgPrice[day] * avgFractionFromVote )
        
        uint256 ubi;
        for (uint256 i=0; i< tagsIndex; i++) {
            ubi = ubi + (
                multiplier * (
                    uint256(ratiosData[_tagsIndices[i]].average) * (avgPrices[_tagsIndices[i]][dateIndex]) / (multiplier)
                ) / multiplier
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
        uint256 y = (block.timestamp).getYear();
        uint256 m = (block.timestamp).getMonth();
        uint256 d = (block.timestamp).getDay();
        dateIndex = (uint256(y)).toTimestamp(uint256(m),uint256(d));
    }
    
    function _record(
        bytes32 tagBytes32, 
        int256 ratio
    ) 
        private 
    {
        ratio = ratio*int256(multiplier);
        
        ratiosData[tagBytes32].total = ratiosData[tagBytes32].total + ratio;
        
        if (ratiosData[tagBytes32].alreadyInit == false) {
            ratiosData[tagBytes32].alreadyInit = true;
            ratiosData[tagBytes32].count = 1;
            ratiosData[tagBytes32].average = ratio;
            ratiosData[tagBytes32].prevRatio = ratio;
        } else {
            ratiosData[tagBytes32].count = ratiosData[tagBytes32].count + 1;
            //int256 oldAverage = ratiosData[tagBytes32].average;
            
            // https://stackoverflow.com/questions/10930732/c-efficiently-calculating-a-running-median/15150143#15150143
            // for each sample
            // average += ( sample - average ) * 0.1f; // rough running average.
            // median += _copysign( average * 0.01, sample - median );
            // but "0.1f" replace to "sampleSize"
            ratiosData[tagBytes32].average = ratiosData[tagBytes32].average + (
                (
                    (
                        (int256(ratio))- (ratiosData[tagBytes32].average)
                    ) / (int256(sampleSize))
                )
            );
            
            ratiosData[tagBytes32].prevRatio = ratio;
            
            
        }
        
    }
    
    function createTag(bytes32 tag) private {
        if (_tags[tag] == 0) {
            _tags[tag] = tagsIndex;
            _tagsIndices[tagsIndex] = tag;
            tagsIndex = tagsIndex + 1;
        }
       
    }
    
}