// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
//import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../access/TrustedForwarder.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../IntercoinTrait.sol";

abstract contract IncomeContractBase is TrustedForwarder, ReentrancyGuardUpgradeable, IntercoinTrait {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    struct Restrict {
        uint256 amount;
        uint256 startTime;
        uint256 untilTime;
        bool gradual;
        uint32 fraction;
    }
    
    struct RestrictParam {
        uint256 amount;
        uint256 untilTime;
        bool gradual;
        uint32 fraction;
    }
    
    
    modifier recipientExists(address recipient) {
        require(recipients[recipient].exists == true, "NO_SUCH_RECIPIENT");
        _;
    }
    
    modifier canManage(address recipient) {
        require(recipients[recipient].managers.contains(_msgSender()) == true, "CANNOT_MANAGE");
        _;
    }
   
    struct Recipient {
        address addr;
        uint256 amountMax;
        uint256 amountPaid;
        uint256 amountAllowedByManager;
        Restrict[] restrictions;
        
        EnumerableSetUpgradeable.AddressSet managers;
        
        bool exists;
    }
    
    mapping(address => Recipient) recipients;
    address tokenAddr;
    
    function __IncomeContract_init(
        address token // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
    ) 
        internal
        onlyInitializing
    {
        __TrustedForwarder_init();
        __ReentrancyGuard_init();
        
        tokenAddr = token;
    }
    
    receive() external payable {
        // payable fallback to receive and store ETH
    }
   
    ///////////////////////////////////////////////////
    //////////// owner section ////////////////////////
    /**
     * @param recipient recipient
     */
    function addRecipient(
        address recipient
    ) 
        public 
        onlyOwner 
    {
        if (recipients[recipient].exists == false) {
            recipients[recipient].exists = true;
            recipients[recipient].addr = recipient;
            recipients[recipient].amountMax = 0;
            recipients[recipient].amountPaid = 0;
            recipients[recipient].amountAllowedByManager = 0;
            
            
           // recipients[recipient].gradual = false;

        }
        
    }
    
    /**
     * Setup restrictions by owner
     * @param recipient recipient
     * @param restrictions restrictions
     * param amount amount
     * param untilTime untilTime in unixtimestamp
     * param gradual gradual
     */
    function setLockup(
        address recipient,
        RestrictParam[] memory restrictions
    ) 
        public 
        onlyOwner 
        recipientExists(recipient)
    {

        for (uint256 i = 0; i < restrictions.length; i++ ) {
            // add to amountMax
            recipients[recipient].amountMax = recipients[recipient].amountMax + restrictions[i].amount;
            
            // adding restriction
            require(restrictions[i].untilTime > block.timestamp, "untilTime");
            recipients[recipient].restrictions.push(Restrict({
                amount: restrictions[i].amount,
                startTime: block.timestamp,
                untilTime: restrictions[i].untilTime,
                gradual: restrictions[i].gradual
            }));
            
        }
    }
    
    /** allow manager pay some funds to recipients
     * @param recipient recipient"s address
     * @param manager manager"s address
     */
    function addManager(
        address recipient, 
        address manager
    ) 
        public 
        onlyOwner 
    {
        recipients[recipient].managers.add(manager);
    }
    
    /** disallow manager pay some funds to recipients
     * @param recipient recipient"s address
     * @param manager manager"s address
     */
    function removeManager(
        address recipient, 
        address manager
    ) 
        public 
        onlyOwner 
    {
        recipients[recipient].managers.remove(manager);
    }
    
    ///////////////////////////////////////////////////
    //////////// managers section /////////////////////
    
    /**
     * @param recipient recipient"s address
     * @param amount amount to pay 
     */
    function pay(
        address recipient, 
        uint256 amount
    ) 
        public 
        recipientExists(recipient)
        canManage(recipient)
    {
        
        (uint256 maximum, uint256 paid, uint256 locked, uint256 allowedByManager, ) = _viewLockup(recipient);
        
        uint256 availableUnlocked = maximum - paid - locked;
        
        require (amount > 0, "Amount can not be a zero");

        require (amount <= availableUnlocked, "AMOUNT_EXCEEDS_BALANCE");
        require (amount <= availableUnlocked - allowedByManager, "AMOUNT_EXCEEDS_RATE");
        
        recipients[recipient].amountAllowedByManager = recipients[recipient].amountAllowedByManager + amount;
        
    }
    
    ///////////////////////////////////////////////////
    //////////// recipients section ///////////////////

    function claim(
    ) 
        public 
        recipientExists(_msgSender())
        nonReentrant()
    {
        address ms = _msgSender();
        
        (,, uint256 locked, uint256 allowedByManager, ) = _viewLockup(ms);
        
        uint256 amount = (recipients[ms].managers.length() > 0 && recipients[ms].managers.at(0) == ms)
            ? locked : allowedByManager;
        
        // 40 20 0 10 => 40 30 0 0
        require (amount > 0, "NOTHING_AVAILABLE_TO_CLAIM");

        recipients[].amountAllowedByManager = 0;
        recipients[ms].amountPaid = recipients[ms].amountPaid + amount;
        bool success = _claim(ms, amount);

        require(success == true, "NOT_ENOUGH_FUNDS");
        
    }
    
    
    
    /**
     * View restrictions setup by owner
     * @param recipient recipient
     * @return maximum maximum
     * @return paid paid
     * @return locked locked
     * @return allowedByManager allowedByManager
     * 
     */
    function viewLockup(
        address recipient
    ) 
        public 
        view
        returns (
            uint256 maximum,
            uint256 paid,
            uint256 locked,
            uint256 allowedByManager
        )
    {
        require(recipients[recipient].exists == true, "NO_SUCH_RECIPIENT");
        (maximum, paid, locked,allowedByManager,) = _viewLockup(recipient);
    }
    
    
    /**
     * @param recipient recipient"s address
     */
    function _claim(
        address recipient, 
        uint256 amount
    ) 
        internal 
        returns(
            bool success
        ) 
    {
        uint256 balance = (tokenAddr == address(0))
            ? address(this).balance
            : IERC20Upgradeable(tokenAddr).balanceOf(address(this));
        if (balance < amount) {
            success = false;
        } else {
            if (tokenAddr == address(0)) {
                address payable addr = payable(recipient);
                success = addr.send(amount);
            } else {
                success = IERC20Upgradeable(tokenAddr).transfer(recipient, amount);
            }
        }
    }
    
    function _calcLock(
        Restrict[] memory restrictions
    ) 
        internal 
        view 
        returns(uint256 locked) 
    {
        locked = 0;
        uint256 fundsPerSecond;
        for (uint256 i = 0; i < restrictions.length; i++ ) {
            if (restrictions[i].untilTime > block.timestamp) {
                uint32 amount = restrictions[i].amount;
                if (restrictions[i].fraction > 0) {
                    uint256 balance = (tokenAddr == address(0))
                        ? address(this).balance
                        : IERC20Upgradeable(tokenAddr).balanceOf(address(this));
                    uint32 relativeAmount = restrictions[i].fraction * balance / 100000;
                    if (relativeAmount < amount || amount == 0) {
                        amount = relativeAmount;
                    }
                }
                if (restrictions[i].gradual == true) {
                    fundsPerSecond = amount / (restrictions[i].untilTime - restrictions[i].startTime);
                    locked = locked + (
                        fundsPerSecond * (restrictions[i].untilTime - block.timestamp)
                    );
                    
                } else {
                    locked = locked + amount;
                
                }
            }
        }
    
    }
    
    /**
     * @param recipient recipient"s address
     */
    function _viewLockup(
        address recipient
    ) 
        internal 
        view
        returns (
            uint256 maximum,
            uint256 paid,
            uint256 locked,
            uint256 allowedByManager,
            Restrict[] memory restrictions
        )
    {
        
        maximum = recipients[recipient].amountMax;
        paid = recipients[recipient].amountPaid;
        locked = _calcLock(recipients[recipient].restrictions);
        allowedByManager = recipients[recipient].amountAllowedByManager;
        restrictions = recipients[recipient].restrictions;
        
    }
}
