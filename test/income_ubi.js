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
const RATE_MULTIPLIER = BigInt('1000000');
const MEMBERSROLE= 1;//'members';
const UBIROLE = 2;//'members'
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

describe("IncomeContractUBI",  function() {
    
    // setup useful values
    const oneEther = 1000000000000000000; // 1eth
    const oneToken = 1000000000000000000; // 1token = 1e18
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // vars
    var ERC20TokenFactory, IncomeContractUBIMockFactory, CommunityMockFactory;
    var IncomeContractUBIMockInstance, ERC20MintableToken, CommunityMockInstance;
    var ReleaseManagerFactoryF;
    var ReleaseManagerF;
    
            
    beforeEach("deploying", async() => {
        const accounts = await ethers.getSigners();
        // Setup accounts.
        owner = accounts[0];    
        accountOne = accounts[1];
        accountTwo = accounts[2];  
        accountThree = accounts[3];
        accountFourth= accounts[4];
        accountFive = accounts[5];
        accountSix = accounts[6];
        accountSeven = accounts[7];
        accountEight = accounts[8];
        accountNine = accounts[9];
        accountTen = accounts[10];
        accountEleven = accounts[11];
        trustedForwarder = accounts[12];


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

    for (const trustedForwardMode of [false,true]) {

    for ( const ETHMode of [true, false]) {

    if (!trustedForwardMode) {  
    it("should produce deterministic", async() => {
        const salt    = "0x00112233445566778899AABBCCDDEEFF00000000000000000000000000000000";
        let tx = await IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address,address,uint8,uint8)"](
            salt,
            (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target, 
            CommunityMockInstance.target, 
            MEMBERSROLE, 
            UBIROLE
        );

        let rc = await tx.wait(); // 0ms, as tx is already confirmed
        let event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        //let [instance,] = event.args;
        
        await expect(
            IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address,address,uint8,uint8)"](
                salt,
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target, 
                CommunityMockInstance.target, 
                MEMBERSROLE, 
                UBIROLE
            )
        ).to.be.revertedWith('ERC1167: create2 failed');

        expect(await IncomeContractFactory.connect(owner).instancesCount()).to.be.eq(ONE);
    });
    }

    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+"Factory tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {
        let tx = await IncomeContractFactory.connect(owner)["produce(address,address,uint8,uint8)"](
            (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target, 
            CommunityMockInstance.target, 
            MEMBERSROLE, 
            UBIROLE
        );
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        const [instance,] = event.args;

        IncomeContractUBIMockInstance = await ethers.getContractAt("IncomeContractUBIMock",instance);

        if (trustedForwardMode) {
            await IncomeContractUBIMockInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'addRecipient(address)', [accountOne.address], "Ownable: caller is not the owner");
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addRecipient(address)', [accountOne.address]);

        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractUBIMockInstance.target, value: TEN * (TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractUBIMockInstance.target, TEN * (TENIN18));
        }
                                                                                                                        // recipient, manager
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);

        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'addManager(address,address)', [accountFourth.address, accountFive.address], "Ownable: caller is not the owner");

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

        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountOne.address, t]);

        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // pass 1 hour
        await passTime(1*60*60);

        // reverts  because manager didn't pay yet
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");

        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);

        let balanceIncomeContractUBIMockInstanceBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.target));
        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', []);
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractUBIMockInstanceAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.target));
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

        //'Balance at Contract wrong after claim'
        expect(
            balanceIncomeContractUBIMockInstanceBefore
        ).to.be.eq(balanceIncomeContractUBIMockInstanceAfter + (TWO * (TENIN18)));
        
        // reverts. recipient already got own 2 eth for first hour
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)], "AMOUNT_EXCEEDS_BALANCE");

        // pass another 1 hour
        await passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH * (TENIN18)], "AMOUNT_EXCEEDS_BALANCE");
        
        // manager pay send 2 eth
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);

        // pass last 1 hour
        await passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH * (TENIN18)], "AMOUNT_EXCEEDS_RATE");
        
        // so pay only 2 eth left
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractUBIMockInstanceBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.target));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', []);
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractUBIMockInstanceAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.target) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.target));
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
            balanceIncomeContractUBIMockInstanceBefore2
        ).to.be.eq(balanceIncomeContractUBIMockInstanceAfter2 + (FOURTH * (TENIN18)));

    });
    }
    
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+'Factory test UBI(short)', async () => {
        let avg1,avg2,avg3,tmp,tmp1,balanceAccountTwoBefore,balanceAccountTwoAfter,avgRatio,ubiVal;
        
        let tx = await IncomeContractFactory.connect(owner)["produce(address,address,uint8,uint8)"](
            ERC20MintableToken.target, 
            CommunityMockInstance.target, 
            MEMBERSROLE, 
            UBIROLE
        );
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        const [instance,] = event.args;

        IncomeContractUBIMockInstance = await ethers.getContractAt("IncomeContractUBIMock",instance);
        
        if (trustedForwardMode) {
            await IncomeContractUBIMockInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await ERC20MintableToken.connect(owner).mint(IncomeContractUBIMockInstance.target, TEN * (TENIN18));
       
        let SomeExternalContractMockFactory = await ethers.getContractFactory("SomeExternalContractMock");

        var SomeExternalContractMockInstance = await SomeExternalContractMockFactory.connect(owner).deploy(IncomeContractUBIMockInstance.target);

        var ratioMultiplier = await IncomeContractUBIMockInstance.connect(accountTwo).getRatioMultiplier();

        await expect(
            SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', TEN)
        ).to.be.revertedWith("Sender has not in accessible List");

        await CommunityMockInstance.setRoles(SomeExternalContractMockInstance.target, [MEMBERSROLE]);

        // set ratio  0.4,0.5,0.6
        // set avg price 1 token
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (4n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (5n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (6n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setAvgPrice('price', ONE * (TENIN18));

        // avg2 = avg1.plus((BigNumber(0.5).minus(avg1)) / (BigNumber(10)));
        // avg3 = avg2.plus((BigNumber(0.6).minus(avg2)) / (BigNumber(10)));
        // avgRatio = avg3;
        // ubiVal = (BigNumber(avgRatio).times(BigNumber(1)).times(BigNumber(oneToken)));
        // make this static vals. ethers can not use float   like 0.123
        avg1 = 0.4
        avg2 = 0.41
        avg3 = 0.429
        avgRatio = 0.429
        ubiVal = ONE * (TENIN18) * (429n) / (1000n);
        //---------------------------------------

        // make first actualize ubi
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'actualizeUBI()', []);

        // pass 1 day = 86400 seconds. 
        await passTime(24*60*60);

        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();

        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

  
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);

        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', [], "Sender has not in accessible List");
        await CommunityMockInstance.setRoles(accountFive.address, [UBIROLE]);

        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
      
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore + (ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();

        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', [], "Amount exceeds balance available to claim");
        //---------------------------------------------------------------------------
        
        // pass another 1 day = 86400 seconds. 
        await passTime(24*60*60);

        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        
        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore + (ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        //---------------------------------------------------------------------------
        
        // for now try to change ratio but not price.
        // ubi value should left the same as previous
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (4n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (5n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (6n) / (10n));
        
        
        await passTime(24*60*60);
        
        // avg1 = avgRatio.plus((BigNumber(0.4).minus(avgRatio)) / (BigNumber(10)));
        // avg2 = avg1.plus((BigNumber(0.5).minus(avg1)) / (BigNumber(10)));
        // avg3 = avg2.plus((BigNumber(0.6).minus(avg2)) / (BigNumber(10)));
        // avgRatio = avg3;
        avg1 = 0.4261;
        avg2 = 0.43349;
        avg3 = 0.450141;
        avgRatio = avg3;
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        //'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);
        
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore + (ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        //---------------------------------------------------------------------------

        // for now try to change ratio AND price.
        // ubi value should to grow up
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (4n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (5n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigInt(ratioMultiplier) * (6n) / (10n));
        await SomeExternalContractMockInstance.connect(accountTwo).setAvgPrice('price', TWO * (TENIN18));
        await passTime(24*60*60);
        
        // avg1 = avgRatio.plus((BigNumber(0.4).minus(avgRatio)) / (BigNumber(10)));
        // avg2 = avg1.plus((BigNumber(0.5).minus(avg1)) / (BigNumber(10)));
        // avg3 = avg2.plus((BigNumber(0.6).minus(avg2)) / (BigNumber(10)));
        // avgRatio = avg3;
        avg1=0.4451269;
        avg2=0.45061421;
        avg3=0.465552789;
        avgRatio = avg3;
        
        // ubiVal = (BigNumber(avgRatio).times(BigNumber(2)).times(BigNumber(oneToken)));
        //ubiVal = (TENIN18) * (avgRatio) * (2);
        ubiVal = (TENIN18) * (465552789n) * (2n) / (1000000000n);

        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();

        //'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);
        
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBIMockInstance, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore + (ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        
        // 'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        //---------------------------------------------------------------------------
        
        
    });
    

    }

    
    describe("TrustedForwarder", function () {
        var IncomeContractUBIMockInstance;
        beforeEach("deploying", async() => {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,uint8,uint8)"](
                ZERO_ADDRESS, 
                CommunityMockInstance.target, 
                MEMBERSROLE, 
                UBIROLE
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractUBIMockInstance = await ethers.getContractAt("IncomeContractUBIMock",instance);
        });
        it("should be empty after init", async() => {
            expect(await IncomeContractUBIMockInstance.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("should be setup by owner", async() => {
            await expect(IncomeContractUBIMockInstance.connect(accountOne).setTrustedForwarder(accountTwo.address)).to.be.revertedWith("Ownable: caller is not the owner");
            expect(await IncomeContractUBIMockInstance.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            await IncomeContractUBIMockInstance.connect(owner).setTrustedForwarder(accountTwo.address);
            expect(await IncomeContractUBIMockInstance.connect(accountOne).isTrustedForwarder(accountTwo.address)).to.be.true;
        });
        
        it("should drop trusted forward if trusted forward become owner ", async() => {
            await IncomeContractUBIMockInstance.connect(owner).setTrustedForwarder(accountTwo.address);
            expect(await IncomeContractUBIMockInstance.connect(accountOne).isTrustedForwarder(accountTwo.address)).to.be.true;
            await IncomeContractUBIMockInstance.connect(owner).transferOwnership(accountTwo.address);
            expect(await IncomeContractUBIMockInstance.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("shouldnt become owner and trusted forwarder", async() => {
            await expect(IncomeContractUBIMockInstance.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWith("FORWARDER_CAN_NOT_BE_OWNER");
        });
        
    });
});
