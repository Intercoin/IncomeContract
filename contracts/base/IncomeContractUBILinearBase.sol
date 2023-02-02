// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../lib/DateTime.sol";

import "../interfaces/IUBILinear.sol";
//import "../interfaces/ICommunity.sol";
import "@artman325/community/contracts/interfaces/ICommunity.sol";


import "../base/IncomeContractBase.sol";
import "./UBIBase.sol";

//import "hardhat/console.sol";

abstract contract IncomeContractUBILinearBase is IUBILinear, IncomeContractBase, UBIBase {
    using DateTime for uint256;

    struct UBIStruct {
        uint256 lastIndex;
        uint256 claimed;
        uint256 total;
        //uint256 prevUBI;
        bool exists;
    }
    
    uint256 private startDateIndex;

    uint256 public ubiQuantity;
    uint256 public ubiPeriod;

    mapping(address => UBIStruct) users;

    function __IncomeContractUBILinearBase_init(
        address token_, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        address community_,
        uint8 ubiRole_,
        uint256 ubiQuantity_, 
        uint256 ubiPeriod_
    )  
        internal
        onlyInitializing
    {
        __IncomeContract_init(token_);
        __UBIBase_init(community_, ubiRole_); 
        ubiQuantity = ubiQuantity_;
        ubiPeriod = ubiPeriod_;

        startDateIndex = getCurrentDateIndex();
    }

    function checkUBI(
    ) 
        public 
        view
        override 
        returns(uint256 ubi) 
    {
        address sender = _msgSender();
        uint256 lastIndex = users[sender].lastIndex;
        uint256 claimed = users[sender].claimed;
        uint256 total = users[sender].total;

        if (users[sender].exists == false) {
            lastIndex = startDateIndex;
        }
        
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);

        for (uint256 i = lastIndex; i < untilIndex; i = i + ubiPeriod) {
            total = total + ubiQuantity;
            lastIndex = i + ubiPeriod;
            
        }
        ubi = total - claimed;
    }
    
    function claimUBI(
    ) 
        public 
        override 
        
    {
        
        address sender = _msgSender();
        canObtainUBI(sender);
        _actualizeUBI(sender);
        uint256 toPay = users[sender].total - users[sender].claimed;
        require(toPay > 0, "Amount exceeds balance available to claim");
        users[sender].claimed = users[sender].claimed + toPay;
        bool success = _claim(sender, toPay);
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
            users[account].exists = true;
        }
        
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);

        for (uint256 i = users[account].lastIndex; i < untilIndex; i = i + ubiPeriod) {
            users[account].total += ubiQuantity;
            users[account].lastIndex += ubiPeriod;

        }
        ubi = users[account].total - users[account].claimed;
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
        uint256 h = (block.timestamp).getHour();
        uint256 min = (block.timestamp).getMinute();
        uint256 s = (block.timestamp).getMinute();
        dateIndex = DateTime.toTimestamp(y, m, d, h, min, s);
    }

}