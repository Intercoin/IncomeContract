const { expect } = require('chai');
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
require("@nomicfoundation/hardhat-chai-matchers");
const mixedCall = require('../js/mixedCall.js');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

const ZERO = BigInt('0');
const ONE = BigInt('1');
const TWO = BigInt('2');
const THREE = BigInt('3');
const FOURTH = BigInt('4');
const SIX = BigInt('6');
const EIGHT = BigInt('8');
const NINE = BigInt('9');
const TEN = BigInt('10');
const HUN = BigInt('100');

const TENIN18 = ethers.parseEther('1');

const FRACTION = BigInt('100000');

//const RATE_MULTIPLIER = BigInt('1000000');
const UBIROLE = 2;//'members';
const UBIQuantity = THREE * (TENIN18)// * (RATE_MULTIPLIER);
const UBIPeriod = BigInt(3*60*60); // 3 hours
const NO_COSTMANAGER = ZERO_ADDRESS;

var passTime = async(seconds) => {
    if (typeof(seconds) === 'undefined') {
        seconds = 1*60*60; // one hour
    } else {
        seconds = parseInt(seconds);
    }
    // pass last 1 hour
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine');
}
var owner;
var accountOne;
var accountTwo;
var accountThree;
var accountFourth;
var accountFive;
var accountSix;
var accountSeven;
var accountEight;
var accountNine;
var accountTen;
var accountEleven;
var trustedForwarder;

describe("IncomeContractUBILinear",  function() {

    // setup useful values
    const oneEther = 1000000000000000000; // 1eth
    const oneToken = 1000000000000000000; // 1token = 1e18
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // vars
    var ERC20TokenFactory, IncomeContractUBILinearFactory, CommunityMockFactory;
    var IncomeContractUBILinearInstance, ERC20MintableToken, CommunityMockInstance;
    var ReleaseManagerFactoryF;
    var ReleaseManagerF;
    var snapId;

    
    beforeEach("deploying", async() => {
        const accounts = await ethers.getSigners();
        // Setup accounts.
        owner = accounts[0];    
        accountOne = accounts[1];
        accountTwo = accounts[2];  
        accountFourth= accounts[4];
        accountFive = accounts[5];
        accountNine = accounts[9];
        trustedForwarder = accounts[12];

        // make snapshot before time manipulations
        snapId = await ethers.provider.send('evm_snapshot', []);
        
        ReleaseManagerFactoryF= await ethers.getContractFactory("MockReleaseManagerFactory")
        ReleaseManagerF = await ethers.getContractFactory("MockReleaseManager");
        let implementationReleaseManager    = await ReleaseManagerF.deploy();
        let releaseManagerFactory   = await ReleaseManagerFactoryF.connect(owner).deploy(implementationReleaseManager.target);
        let tx,rc,event,instance,instancesCount;
        //
        tx = await releaseManagerFactory.connect(owner).produce();
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceProduced');
        [instance, instancesCount] = event.args;
        let releaseManager = await ethers.getContractAt("MockReleaseManager",instance);

        ERC20TokenFactory = await ethers.getContractFactory("ERC20Mintable");
        CommunityMockFactory = await ethers.getContractFactory("CommunityMock");

        ERC20MintableToken = await ERC20TokenFactory.connect(owner).deploy('t2','t2');
        CommunityMockInstance = await CommunityMockFactory.connect(owner).deploy();

        /// IncomeContractFactory
        IncomeContractFactoryFactory = await ethers.getContractFactory("IncomeContractFactory");
        IncomeContractMockFactory = await ethers.getContractFactory("IncomeContractMock");
        IncomeContractUBIMockFactory = await ethers.getContractFactory("IncomeContractUBIMock");
        IncomeContractUBILinearFactory = await ethers.getContractFactory("IncomeContractUBILinear");
         
        IncomeContractMock = await IncomeContractMockFactory.connect(owner).deploy();
        IncomeContractUBIMockInstance = await IncomeContractUBIMockFactory.connect(owner).deploy();
        IncomeContractUBILinearInstance = await IncomeContractUBILinearFactory.connect(owner).deploy();

        IncomeContractFactory = await IncomeContractFactoryFactory.connect(owner).deploy(
            IncomeContractMock.target,
            IncomeContractUBIMockInstance.target,
            IncomeContractUBILinearInstance.target,
            NO_COSTMANAGER,
            releaseManager.target
        );
        //-----------------
    });

    afterEach("deploying", async() => { 
        // restore snapshot
        await ethers.provider.send('evm_revert', [snapId]);
        //console.log(`afterEach("deploying"`);
    });

    for (const trustedForwardMode of [false,true]) {

    for ( const ETHMode of [true, false]) {
    if (!trustedForwardMode) {
    it("should produce deterministic", async() => {
        const salt    = "0x00112233445566778899AABBCCDDEEFF00000000000000000000000000000000";
        let tx = await IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address,address,uint8,uint256,uint256)"](
            salt,
            (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target, 
            CommunityMockInstance.target, 
            UBIROLE,
            UBIQuantity,
            UBIPeriod
        );

        let rc = await tx.wait(); // 0ms, as tx is already confirmed
        let event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        //let [instance,] = event.args;
        
        await expect(
            IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address,address,uint8,uint256,uint256)"](
                salt,
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target, 
                CommunityMockInstance.target, 
                UBIROLE,
                UBIQuantity,
                UBIPeriod
            )
        ).to.be.revertedWith('ERC1167: create2 failed');

        expect(await IncomeContractFactory.connect(owner).instancesCount()).to.be.eq(ONE);
    });
    }

    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+"Factory tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {
       
        let tx = await IncomeContractFactory.connect(owner)["produce(address,address,uint8,uint256,uint256)"](
            (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target, 
            CommunityMockInstance.target, 
            UBIROLE,
            UBIQuantity,
            UBIPeriod
        );
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        const [instance,] = event.args;

        IncomeContractUBILinearInstance = await ethers.getContractAt("IncomeContractUBILinear",instance);
       
        if (trustedForwardMode) {
            await IncomeContractUBILinearInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'addRecipient(address)', [accountOne.address], "Ownable: caller is not the owner");
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addRecipient(address)', [accountOne.address]);

        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractUBILinearInstance.target, value: TEN * (TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractUBILinearInstance.target, TEN * (TENIN18));
        }
                                                                 // recipient, manager
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);

        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'addManager(address,address)', [accountFourth.address, accountFive.address], "Ownable: caller is not the owner");

        let blockNumber = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(blockNumber);
        timeNow = block.timestamp;

        let t = [];
        t.push({
            amount: TWO * (TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false, 
            fraction: FRACTION
        });
        t.push({
            amount: TWO * (TENIN18), 
            untilTime: timeNow+2*60*60, 
            gradual: false, 
            fraction: FRACTION
        });
        t.push({
            amount: TWO * (TENIN18), 
            untilTime: timeNow+3*60*60, 
            gradual: false, 
            fraction: FRACTION
        });

        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountOne.address, t]);
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // pass 1 hour
        await passTime(1*60*60);

        // reverts  because manager didn't pay yet
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);

        let balanceIncomeContractUBILinearInstanceBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.target));
        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', []);
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractUBILinearInstanceAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.target));
        let balanceAccountOneAfter = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));
        
        // wrong claim
        expect(
            balanceAccountOneBefore + (TWO * (TENIN18)) - (
                    (trustedForwardMode == false)
                    ?
                    (
                        (ETHMode) 
                        ?
                        claimTx.gasUsed * (claimTx.gasPrice)
                        :
                        0n
                    )
                    :
                    (
                        0n
                    )
                )
        ).to.be.eq(balanceAccountOneAfter);

        // reverts. recipient already got own 2 eth for first hour
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)], "AMOUNT_EXCEEDS_BALANCE");

        // pass another 1 hour
        await passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH * (TENIN18)], "AMOUNT_EXCEEDS_BALANCE");
        
        // manager pay send 2 eth
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);

        // pass last 1 hour
        await passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH * (TENIN18)], "AMOUNT_EXCEEDS_RATE");
        
        // so pay only 2 eth left
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractUBILinearInstanceBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.target));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', []);
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractUBILinearInstanceAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.target));
        let balanceAccountOneAfter2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // wrong claim
        expect(
            balanceAccountOneBefore2
                 + (FOURTH * (TENIN18))
                 - (
                    (trustedForwardMode == false)
                    ?
                    (
                        (ETHMode) 
                        ?
                        claimTx2.gasUsed * (claimTx2.gasPrice)
                        :
                        0n
                    )
                    :
                    (
                        0n
                    )
                )
        ).to.be.eq(balanceAccountOneAfter2);

        //'Balance at Contract wrong after claim'
        expect(
            balanceIncomeContractUBILinearInstanceBefore2
        ).to.be.eq(balanceIncomeContractUBILinearInstanceAfter2 + (FOURTH * (TENIN18)));

    });
    }
    

    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+'Factory test UBI(short)', async () => {
        let avg1,avg2,avg3,tmp,tmp1,balanceAccountTwoBefore,balanceAccountTwoAfter,avgRatio,ubiVal,timePassed;
        
        let tx = await IncomeContractFactory.connect(owner)["produce(address,address,uint8,uint256,uint256)"](
            ERC20MintableToken.target, 
            CommunityMockInstance.target, 
            UBIROLE,
            UBIQuantity,
            UBIPeriod
        );
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        const [instance,] = event.args;

        IncomeContractUBILinearInstance = await ethers.getContractAt("IncomeContractUBILinear",instance);
        
        if (trustedForwardMode) {
            await IncomeContractUBILinearInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await ERC20MintableToken.connect(owner).mint(IncomeContractUBILinearInstance.target, TEN * (TENIN18));

        let SomeExternalContractMockFactory = await ethers.getContractFactory("SomeExternalContractMock");

        var SomeExternalContractMockInstance = await SomeExternalContractMockFactory.connect(owner).deploy(IncomeContractUBILinearInstance.target);

        // make first actualize ubi
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'actualizeUBI()', []);

        timePassed = 6*60*60 // 6 hours
        await passTime(timePassed);

        ubiVal = (BigInt(timePassed) / (UBIPeriod)) * (UBIQuantity);
        //---------------------------------------

        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();

        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

  

        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', [], "Sender has not in accessible List");

        await CommunityMockInstance.setRoles(accountFive.address, [UBIROLE]);
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore + (ubiVal));
        
        
        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', [], "Amount exceeds balance available to claim");
        //---------------------------------------------------------------------------
        
        
        // pass another 3 hours
        timePassed = 3*60*60
        await passTime(timePassed);

        ubiVal = (BigInt(timePassed) / (UBIPeriod)) * (UBIQuantity);

        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        
        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);

        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore + (ubiVal));
        
        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        

        // pass another 3 hours. try to claim and should be reverted with message "NOT_ENOUGH_FUNDS"
        // 10-6-3-3=-2
        timePassed = 3*60*60
        await passTime(timePassed);

        await mixedCall(IncomeContractUBILinearInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', [], "NOT_ENOUGH_FUNDS");

    });

    }    


    describe("TrustedForwarder", function () {
        var IncomeContractUBILinearInstance;
        beforeEach("deploying", async() => {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,uint8,uint256,uint256)"](
                ZERO_ADDRESS,
                CommunityMockInstance.target, 
                UBIROLE,
                UBIQuantity,
                UBIPeriod
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractUBILinearInstance = await ethers.getContractAt("IncomeContractUBILinear",instance);
        });
        it("should be empty after init", async() => {
            expect(await IncomeContractUBILinearInstance.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("should be setup by owner", async() => {
            await expect(IncomeContractUBILinearInstance.connect(accountOne).setTrustedForwarder(accountTwo.address)).to.be.revertedWith("Ownable: caller is not the owner");
            expect(await IncomeContractUBILinearInstance.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            await IncomeContractUBILinearInstance.connect(owner).setTrustedForwarder(accountTwo.address);
            expect(await IncomeContractUBILinearInstance.connect(accountOne).isTrustedForwarder(accountTwo.address)).to.be.true;
        });
        
        it("should drop trusted forward if trusted forward become owner ", async() => {
            await IncomeContractUBILinearInstance.connect(owner).setTrustedForwarder(accountTwo.address);
            expect(await IncomeContractUBILinearInstance.connect(accountOne).isTrustedForwarder(accountTwo.address)).to.be.true;
            await IncomeContractUBILinearInstance.connect(owner).transferOwnership(accountTwo.address);
            expect(await IncomeContractUBILinearInstance.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("shouldnt become owner and trusted forwarder", async() => {
            await expect(IncomeContractUBILinearInstance.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWith("FORWARDER_CAN_NOT_BE_OWNER");
        });
        
    });
});
