// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

abstract contract UBIBase {

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

    function canObtainUBI() internal virtual;
    function _actualizeUBI(address account) internal  virtual returns(uint256 ubi);

}