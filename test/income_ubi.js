const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect } = require('chai');
const chai = require('chai');
const { time } = require('@openzeppelin/test-helpers');
const mixedCall = require('../js/mixedCall.js');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

const ZERO = BigNumber.from('0');
const ONE = BigNumber.from('1');
const TWO = BigNumber.from('2');
const THREE = BigNumber.from('3');
const FOURTH = BigNumber.from('4');
const SIX = BigNumber.from('6');
const EIGHT = BigNumber.from('8');
const NINE = BigNumber.from('9');
const TEN = BigNumber.from('10');
const HUN = BigNumber.from('100');

const TENIN18 = TEN.pow(BigNumber.from('18'));

const FRACTION = BigNumber.from('100000');
const RATE_MULTIPLIER = BigNumber.from('1000000');
const MEMBERSROLE= 'members';
const UBIROLE = 'members'
const NO_COSTMANAGER = ZERO_ADDRESS;

chai.use(require('chai-bignumber')());


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

describe("IncomeContractUBI",  async() => {
    const accounts = waffle.provider.getWallets();

    // Setup accounts.
    const owner = accounts[0];    
    const accountOne = accounts[1];
    const accountTwo = accounts[2];  
    const accountThree = accounts[3];
    const accountFourth= accounts[4];
    const accountFive = accounts[5];
    const accountSix = accounts[6];
    const accountSeven = accounts[7];
    const accountEight = accounts[8];
    const accountNine = accounts[9];
    const accountTen = accounts[10];
    const accountEleven = accounts[11];
    const trustedForwarder = accounts[12];

   
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
        ReleaseManagerFactoryF= await ethers.getContractFactory("MockReleaseManagerFactory")
        ReleaseManagerF = await ethers.getContractFactory("MockReleaseManager");
        let implementationReleaseManager    = await ReleaseManagerF.deploy();
        let releaseManagerFactory   = await ReleaseManagerFactoryF.connect(owner).deploy(implementationReleaseManager.address);
        let tx,rc,event,instance,instancesCount;
        //
        tx = await releaseManagerFactory.connect(owner).produce();
        rc = await tx.wait(); // 0ms, as tx is already confirmed
        event = rc.events.find(event => event.event === 'InstanceProduced');
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
            IncomeContractMock.address,
            IncomeContractUBIMockInstance.address,
            IncomeContractUBILinearInstance.address,
            NO_COSTMANAGER,
            releaseManager.address
        );
        //-----------------
    });

    for (const trustedForwardMode of [false,trustedForwarder]) {
    for ( const FactoryMode of [true, false]) {

    for ( const ETHMode of [true, false]) {
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+(FactoryMode ? "Factory " : "")+"tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {
        if (FactoryMode == true) {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,string,string)"](
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                MEMBERSROLE, 
                UBIROLE
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractUBIMockInstance = await ethers.getContractAt("IncomeContractUBIMock",instance);
        } else {

            await IncomeContractUBIMockInstance.connect(owner).init(
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                MEMBERSROLE, 
                UBIROLE
            );
        }

        if (trustedForwardMode) {
            await IncomeContractUBIMockInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'addRecipient(address)', [accountOne.address], "Ownable: caller is not the owner");
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, owner, 'addRecipient(address)', [accountOne.address]);

        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractUBIMockInstance.address, value: TEN.mul(TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractUBIMockInstance.address, TEN.mul(TENIN18));
        }
                                                                                                                        // recipient, manager
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);

        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'addManager(address,address)', [accountFourth.address, accountFive.address], "Ownable: caller is not the owner");

        let blockNumber = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(blockNumber);
        timeNow = block.timestamp;

        let t = [];
        t.push({
            amount: TWO.mul(TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false
        });
        t.push({
            amount: TWO.mul(TENIN18), 
            untilTime: timeNow+2*60*60, 
            gradual: false
        });
        t.push({
            amount: TWO.mul(TENIN18), 
            untilTime: timeNow+3*60*60, 
            gradual: false
        });

        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, owner, 'setLockup(address,(uint256,uint256,bool)[])', [accountOne.address, t]);

        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountOne, 'claim()', [], "There are no available amount to claim");
        
        // pass 1 hour
        passTime(1*60*60);

        // reverts  because manager didn't pay yet
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountOne, 'claim()', [], "There are no available amount to claim");

        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);

        let balanceIncomeContractUBIMockInstanceBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.address));
        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountOne, 'claim()', []);
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractUBIMockInstanceAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.address));
        let balanceAccountOneAfter = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));
        
        // wrong claim
        expect(
            balanceAccountOneBefore
                .add(TWO.mul(TENIN18))
                .sub(
                    (trustedForwardMode == false)
                    ?
                    (
                        (ETHMode) 
                        ?
                        claimTx.cumulativeGasUsed.mul(claimTx.effectiveGasPrice)
                        :
                        0
                    )
                    :
                    (
                        0
                    )

                )
        ).to.be.eq(balanceAccountOneAfter);

        //'Balance at Contract wrong after claim'
        expect(
            balanceIncomeContractUBIMockInstanceBefore
        ).to.be.eq(balanceIncomeContractUBIMockInstanceAfter.add(TWO.mul(TENIN18)));
        
        // reverts. recipient already got own 2 eth for first hour
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountOne, 'claim()', [], "There are no available amount to claim");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)], "Amount exceeds available unlocked balance");

        // pass another 1 hour
        passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH.mul(TENIN18)], "Amount exceeds available unlocked balance");
        
        // manager pay send 2 eth
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);

        // pass last 1 hour
        passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH.mul(TENIN18)], "Amount exceeds available allowed balance by manager");
        
        // so pay only 2 eth left
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractUBIMockInstanceBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.address));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountOne, 'claim()', []);
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractUBIMockInstanceAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBIMockInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBIMockInstance.address));
        let balanceAccountOneAfter2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // wrong claim
        expect(
            balanceAccountOneBefore2
                .add(FOURTH.mul(TENIN18))
                .sub(
                    (trustedForwardMode == false)
                    ?
                    (
                        (ETHMode) 
                        ?
                        claimTx2.cumulativeGasUsed.mul(claimTx2.effectiveGasPrice)
                        :
                        0
                    )
                    :
                    (
                        0
                    )
                )
        ).to.be.eq(balanceAccountOneAfter2);

        //'Balance at Contract wrong after claim'
        expect(
            balanceIncomeContractUBIMockInstanceBefore2
        ).to.be.eq(balanceIncomeContractUBIMockInstanceAfter2.add(FOURTH.mul(TENIN18)));

    });
    }
    
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+(FactoryMode ? "Factory " : "")+'test UBI(short)', async () => {
        let avg1,avg2,avg3,tmp,tmp1,balanceAccountTwoBefore,balanceAccountTwoAfter,avgRatio,ubiVal;
        
        if (FactoryMode == true) {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,string,string)"](
                ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                MEMBERSROLE, 
                UBIROLE
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractUBIMockInstance = await ethers.getContractAt("IncomeContractUBIMock",instance);
        } else {

            await IncomeContractUBIMockInstance.connect(owner).init(
                ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                MEMBERSROLE, 
                UBIROLE
            );
        }

        if (trustedForwardMode) {
            await IncomeContractUBIMockInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await ERC20MintableToken.connect(owner).mint(IncomeContractUBIMockInstance.address, TEN.mul(TENIN18));
       
        let SomeExternalContractMockFactory = await ethers.getContractFactory("SomeExternalContractMock");

        var SomeExternalContractMockInstance = await SomeExternalContractMockFactory.connect(owner).deploy(IncomeContractUBIMockInstance.address);

        var ratioMultiplier = await IncomeContractUBIMockInstance.connect(accountTwo).getRatioMultiplier();

        // set ratio  0.4,0.5,0.6
        // set avg price 1 token
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(4).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(5).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(6).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setAvgPrice('price', ONE.mul(TENIN18));

        // avg2 = avg1.plus((BigNumber(0.5).minus(avg1)).div(BigNumber(10)));
        // avg3 = avg2.plus((BigNumber(0.6).minus(avg2)).div(BigNumber(10)));
        // avgRatio = avg3;
        // ubiVal = (BigNumber(avgRatio).times(BigNumber(1)).times(BigNumber(oneToken)));
        // make this static vals. ethers can not use float   like 0.123
        avg1 = 0.4
        avg2 = 0.41
        avg3 = 0.429
        avgRatio = 0.429
        ubiVal = ONE.mul(TENIN18).mul(429).div(1000);
        //---------------------------------------

        // make first actualize ubi
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'actualizeUBI()', []);

        // pass 1 day = 86400 seconds. 
        passTime(24*60*60);

        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();

        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

  
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
      
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore.add(ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();

        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'claimUBI()', [], "Amount exceeds balance available to claim");
        //---------------------------------------------------------------------------
        
        // pass another 1 day = 86400 seconds. 
        passTime(24*60*60);

        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        
        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore.add(ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        //---------------------------------------------------------------------------
        
        // for now try to change ratio but not price.
        // ubi value should left the same as previous
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(4).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(5).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(6).div(10));
        
        
        passTime(24*60*60);
        
        // avg1 = avgRatio.plus((BigNumber(0.4).minus(avgRatio)).div(BigNumber(10)));
        // avg2 = avg1.plus((BigNumber(0.5).minus(avg1)).div(BigNumber(10)));
        // avg3 = avg2.plus((BigNumber(0.6).minus(avg2)).div(BigNumber(10)));
        // avgRatio = avg3;
        avg1 = 0.4261;
        avg2 = 0.43349;
        avg3 = 0.450141;
        avgRatio = avg3;
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        //'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);
        
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore.add(ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        //---------------------------------------------------------------------------

        // for now try to change ratio AND price.
        // ubi value should to grow up
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(4).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(5).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setRatio('price', BigNumber.from(ratioMultiplier).mul(6).div(10));
        await SomeExternalContractMockInstance.connect(accountTwo).setAvgPrice('price', TWO.mul(TENIN18));
        passTime(24*60*60);
        
        // avg1 = avgRatio.plus((BigNumber(0.4).minus(avgRatio)).div(BigNumber(10)));
        // avg2 = avg1.plus((BigNumber(0.5).minus(avg1)).div(BigNumber(10)));
        // avg3 = avg2.plus((BigNumber(0.6).minus(avg2)).div(BigNumber(10)));
        // avgRatio = avg3;
        avg1=0.4451269;
        avg2=0.45061421;
        avg3=0.465552789;
        avgRatio = avg3;
        
        // ubiVal = (BigNumber(avgRatio).times(BigNumber(2)).times(BigNumber(oneToken)));
        //ubiVal = (TENIN18).mul(avgRatio).mul(2);
        ubiVal = (TENIN18).mul(465552789).mul(2).div(1000000000);

        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();

        //'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);
        
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBIMockInstance, trustedForwardMode, accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore.add(ubiVal));
        
        tmp = await IncomeContractUBIMockInstance.connect(accountFive).checkUBI();
        
        // 'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        //---------------------------------------------------------------------------
        
        
    });
    
    }
    }

    
    describe("TrustedForwarder", function () {
        var IncomeContractUBIMockInstance;
        beforeEach("deploying", async() => {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,string,string)"](
                ZERO_ADDRESS, 
                CommunityMockInstance.address, 
                MEMBERSROLE, 
                UBIROLE
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
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
