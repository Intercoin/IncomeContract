// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//import "./interfaces/IControlContract.sol";
import "./interfaces/IIncomeContract.sol";
import "./interfaces/IIncomeContractUBI.sol";
import "./interfaces/IIncomeContractUBILinear.sol";

contract IncomeContractFactory {
    using Clones for address;

    /**
    * @custom:shortd IncomeContract implementation address
    * @notice IncomeContract implementation address
    */
    address public immutable incomeContractImplementation;

    /**
    * @custom:shortd IncomeContractUBI implementation address
    * @notice IncomeContractUBI implementation address
    */
    address public immutable incomeContractUBIImplementation;

    /**
    * @custom:shortd IncomeContractUBILinear implementation address
    * @notice IncomeContractUBILinear implementation address
    */
    address public immutable incomeContractUBILinearImplementation;

    address[] public instances;
    
    event InstanceCreated(address instance, uint instancesCount);

    /**
    * @param incomeContractImpl address of IncomeContract implementation
    * @param incomeContractUBIImpl address of IncomeContractUBI implementation
    * @param incomeContractUBILinearImpl address of IncomeContractUBILinear implementation
    */
    constructor(
        address incomeContractImpl,
        address incomeContractUBIImpl,
        address incomeContractUBILinearImpl
    ) 
    {
        incomeContractImplementation = incomeContractImpl;
        incomeContractUBIImplementation = incomeContractUBIImpl;
        incomeContractUBILinearImplementation = incomeContractUBILinearImpl;
    }

    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev view amount of created instances
    * @return amount amount instances
    * @custom:shortd view amount of created instances
    */
    function instancesCount()
        external 
        view 
        returns (uint256 amount) 
    {
        amount = instances.length;
    }

    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     * @param token  token address of eth
     */
    function produce(
        address token
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractImplementation.clone();
        _produce(instance);
        IIncomeContract(instance).init(token);
        Ownable(instance).transferOwnership(msg.sender);
    }

    /**
     * @param token  token address of eth
     * @param community address of community contract
     * @param roleName role of contracts who can send stats of prices and ratios
     * @param ubiRoleName role of EOA which can obtain ubi
     */
    function produce(
        address token,
        address community,
        string memory roleName,
        string memory ubiRoleName
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractUBIImplementation.clone();
        _produce(instance);
        IIncomeContractUBI(instance).init(token, community, roleName, ubiRoleName);
        Ownable(instance).transferOwnership(msg.sender);
    }

    /**
     * @param token_ token address of eth
     * @param community_ address of community contract
     * @param ubiRoleName_ role of EOA which can obtain ubi
     * @param ubiQuantity_ ubi's amount for period `ubiPeriod_`
     * @param ubiPeriod_ period for `ubiQuantity_`
     */
    function produce(
        address token_,
        address community_,
        string memory ubiRoleName_,
        uint256 ubiQuantity_, 
        uint256 ubiPeriod_
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractUBILinearImplementation.clone();
        _produce(instance);
        IIncomeContractUBILinear(instance).init(token_, community_, ubiRoleName_, ubiQuantity_, ubiPeriod_);
        Ownable(instance).transferOwnership(msg.sender);
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    function _produce(
        address instance
    ) 
        internal
    {
        require(instance != address(0), "Factory: INSTANCE_CREATION_FAILED");

        instances.push(instance);
        
        emit InstanceCreated(instance, instances.length);
    }

}