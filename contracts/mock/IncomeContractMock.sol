pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "../IncomeContract.sol";


contract IncomeContractMock is IncomeContract {
    constructor(
        address token // can be address(0) = 0x0000000000000000000000000000000000000000   mean   ETH
    )
        public
        
        IncomeContract(token)
    {
        
    }
    // 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2
    function testClaim(address recipient, uint256 amount) public returns(bool success) {
address payable addr = payable(recipient);
success = addr.send(amount);
}
    
}