// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@artman325/community/contracts/interfaces/ICommunity.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract UBIBase is Initializable {
    ICommunity internal community;
    uint8 internal ubiRole;

    function actualizeUBI(
    ) 
        public 
    {
        _actualizeUBI(msg.sender);
    }

    function actualizeUBI(
        address account
    ) 
        public 
    {
        _actualizeUBI(account);
    }

    function __UBIBase_init(
        address communityAddress,
        uint8 role
    )  
        internal
        onlyInitializing
    {
        community = ICommunity(communityAddress);
        ubiRole = role;
    }

    function _checkCommunityRole(address account, uint8 roleIndex) private view {
        require(community.hasRole(account, roleIndex), "Sender has not in accessible List");
    }

    function canRecord(address account, uint8 role) internal view {
        _checkCommunityRole(account, role);
    }
    
    function canObtainUBI(address account) internal view {
        _checkCommunityRole(account, ubiRole);
    }
    
    function _actualizeUBI(address account) internal  virtual returns(uint256 ubi);

}