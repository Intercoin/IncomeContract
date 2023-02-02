// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@artman325/releasemanager/contracts/CostManagerFactoryHelper.sol";
import "@artman325/releasemanager/contracts/ReleaseManagerHelper.sol";
//import "./interfaces/IControlContract.sol";
import "./interfaces/IIncomeContract.sol";
import "./interfaces/IIncomeContractUBI.sol";
import "./interfaces/IIncomeContractUBILinear.sol";

contract IncomeContractFactory is CostManagerFactoryHelper, ReleaseManagerHelper{
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
        address incomeContractUBILinearImpl,
        address costManager,
        address releaseManager
    ) 
        CostManagerFactoryHelper(costManager) 
        ReleaseManagerHelper(releaseManager) 
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
     * @dev cloneDeterministic version
     * @param token  token address of eth
     */
    function produceDeterministic(
        bytes32 salt,
        address token
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractImplementation.cloneDeterministic(salt);
        _produce(instance);
        IIncomeContract(instance).init(token);
        Ownable(instance).transferOwnership(msg.sender);
    }

    /**
     * @param token  token address of eth
     * @param community address of community contract
     * @param role role of contracts who can send stats of prices and ratios
     * @param ubiRole role of EOA which can obtain ubi
     */
    function produce(
        address token,
        address community,
        uint8 role,
        uint8 ubiRole
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractUBIImplementation.clone();
        _produce(instance);
        IIncomeContractUBI(instance).init(token, community, role, ubiRole);
        Ownable(instance).transferOwnership(msg.sender);
    }

    /**
     * @dev cloneDeterministic version
     * @param token  token address of eth
     * @param community address of community contract
     * @param role role of contracts who can send stats of prices and ratios
     * @param ubiRole role of EOA which can obtain ubi
     */
    function produceDeterministic(
        bytes32 salt,
        address token,
        address community,
        uint8 role,
        uint8 ubiRole
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractUBIImplementation.cloneDeterministic(salt);
        _produce(instance);
        IIncomeContractUBI(instance).init(token, community, role, ubiRole);
        Ownable(instance).transferOwnership(msg.sender);
    }

    /**
     * @param token token address of eth
     * @param community address of community contract
     * @param ubiRole role of EOA which can obtain ubi
     * @param ubiQuantity ubi's amount for period `ubiPeriod_`
     * @param ubiPeriod period for `ubiQuantity_`
     */
    function produce(
        address token,
        address community,
        uint8 ubiRole,
        uint256 ubiQuantity, 
        uint256 ubiPeriod
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractUBILinearImplementation.clone();
        _produce(instance);
        IIncomeContractUBILinear(instance).init(token, community, ubiRole, ubiQuantity, ubiPeriod);
        Ownable(instance).transferOwnership(msg.sender);
    }

    /**
     * @dev cloneDeterministic version
     * @param token token address of eth
     * @param community address of community contract
     * @param ubiRole role of EOA which can obtain ubi
     * @param ubiQuantity ubi's amount for period `ubiPeriod_`
     * @param ubiPeriod period for `ubiQuantity_`
     */
    function produceDeterministic(
        bytes32 salt,
        address token,
        address community,
        uint8 ubiRole,
        uint256 ubiQuantity, 
        uint256 ubiPeriod
    ) 
        public 
        returns (address instance) 
    {
        instance = incomeContractUBILinearImplementation.cloneDeterministic(salt);
        _produce(instance);
        IIncomeContractUBILinear(instance).init(token, community, ubiRole, ubiQuantity, ubiPeriod);
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