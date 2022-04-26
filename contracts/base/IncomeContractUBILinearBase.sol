// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../lib/DateTime.sol";

import "../interfaces/IUBILinear.sol";
import "../interfaces/ICommunity.sol";

import "../IncomeContract.sol";

abstract contract IncomeContractUBILinearBase is IUBILinear, IncomeContractBase {
    using DateTime for uint256;

    uint256 constant multiplier = 1e6;

    struct UBIStruct {
        uint256 lastIndex;
        uint256 payed;
        uint256 total;
        //uint256 prevUBI;
        bool exists;
    }
    
    ICommunity private community;
    string private ubiRoleName;

    uint256 private startDateIndex;

    uint256 public ubiQuantity;
    uint256 public ubiPeriod;

    mapping(address => UBIStruct) users;

    modifier canObtainUBI() {
        bool s = _canRecord(ubiRoleName);
        
        require(s == true, "Sender has not in accessible List");
        _;
    }

    function __IncomeContractUBILinearBase_init(
        address token_, // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
        ICommunity community_,
        string memory ubiRoleName_,
        uint256 ubiQuantity_, 
        uint256 ubiPeriod_
    )  
        internal
        onlyInitializing
    {
        __IncomeContract_init(token_);
        community = community_;
        ubiRoleName = ubiRoleName_;
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
        uint256 lastIndex = users[msg.sender].lastIndex;
        uint256 payed = users[msg.sender].payed;
        uint256 total = users[msg.sender].total;
        
        if (users[msg.sender].exists == false) {
            lastIndex = startDateIndex;
        }
       
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);
        for (uint256 i = lastIndex; i < untilIndex; i = i + ubiPeriod) {
            total = total + ubiQuantity;
            lastIndex = i + ubiPeriod;
            
        }
        ubi =  (total - payed) / multiplier;

    }
    
    function claimUBI(
    ) 
        public 
        override 
        canObtainUBI()
    {
        _actualizeUBI();
        uint256 toPay = users[msg.sender].total - users[msg.sender].payed;
        require(toPay / multiplier > 0, "Amount exceeds balance available to claim");
        users[msg.sender].payed = users[msg.sender].payed + toPay;
        bool success = _claim(msg.sender, toPay / multiplier);
        require(success == true, "There are no enough funds at contract");
        
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
            users[msg.sender].exists = true;
        }
        
        uint256 untilIndex = getCurrentDateIndex(); //.add(DAY_IN_SECONDS);
        for (uint256 i=users[msg.sender].lastIndex; i<untilIndex; i = i + ubiPeriod) {
            users[msg.sender].total = users[msg.sender].total + ubiQuantity;
            users[msg.sender].lastIndex = i + ubiPeriod;
        }
        ubi =  (users[msg.sender].total - users[msg.sender].payed) / multiplier;
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

    function _canRecord(string memory roleName) private view returns(bool s){
        s = false;
        string[] memory roles = ICommunity(community).getRoles(msg.sender);
        for (uint256 i=0; i< roles.length; i++) {
            
            if (keccak256(abi.encodePacked(roleName)) == keccak256(abi.encodePacked(roles[i]))) {
                s = true;
            }
        }
    }

}