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

//const RATE_MULTIPLIER = BigNumber.from('1000000');
const UBIROLE = 'members';
const UBIQuantity = THREE.mul(TENIN18)//.mul(RATE_MULTIPLIER);
const UBIPeriod = BigNumber.from(3*60*60); // 3 hours
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

describe("IncomeContractUBILinear",  async() => {
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
    var ERC20TokenFactory, IncomeContractUBILinearFactory, CommunityMockFactory;
    var IncomeContractUBILinearInstance, ERC20MintableToken, CommunityMockInstance;
    var ReleaseManagerFactoryF;
    var ReleaseManagerF;
    var snapId;

    
    beforeEach("deploying", async() => {
        // make snapshot before time manipulations
        snapId = await ethers.provider.send('evm_snapshot', []);
        
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

    afterEach("deploying", async() => { 
        // restore snapshot
        await ethers.provider.send('evm_revert', [snapId]);
        //console.log(`afterEach("deploying"`);
    });

    for (const trustedForwardMode of [false,trustedForwarder]) {
    for ( const FactoryMode of [true, false]) {

    for ( const ETHMode of [true, false]) {
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+(FactoryMode ? "Factory " : "")+"tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {
        if (FactoryMode == true) {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,string,uint256,uint256)"](
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                UBIROLE,
                UBIQuantity,
                UBIPeriod
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractUBILinearInstance = await ethers.getContractAt("IncomeContractUBILinear",instance);
        } else {
        
            await IncomeContractUBILinearInstance.connect(owner).init(
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                UBIROLE,
                UBIQuantity,
                UBIPeriod
            );
        }

        if (trustedForwardMode) {
            await IncomeContractUBILinearInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'addRecipient(address)', [accountOne.address], "Ownable: caller is not the owner");
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, owner, 'addRecipient(address)', [accountOne.address]);

        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractUBILinearInstance.address, value: TEN.mul(TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractUBILinearInstance.address, TEN.mul(TENIN18));
        }
                                                                 // recipient, manager
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);

        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'addManager(address,address)', [accountFourth.address, accountFive.address], "Ownable: caller is not the owner");

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

        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, owner, 'setLockup(address,(uint256,uint256,bool)[])', [accountOne.address, t]);
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountOne, 'claim()', [], "There are no available amount to claim");
        
        // pass 1 hour
        passTime(1*60*60);

        // reverts  because manager didn't pay yet
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountOne, 'claim()', [], "There are no available amount to claim");
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);

        let balanceIncomeContractUBILinearInstanceBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountOne, 'claim()', []);
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractUBILinearInstanceAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
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

        // reverts. recipient already got own 2 eth for first hour
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountOne, 'claim()', [], "There are no available amount to claim");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)], "Amount exceeds available unlocked balance");

        // pass another 1 hour
        passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH.mul(TENIN18)], "Amount exceeds available unlocked balance");
        
        // manager pay send 2 eth
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);

        // pass last 1 hour
        passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, FOURTH.mul(TENIN18)], "Amount exceeds available allowed balance by manager");
        
        // so pay only 2 eth left
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractUBILinearInstanceBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountOne, 'claim()', []);
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractUBILinearInstanceAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
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
            balanceIncomeContractUBILinearInstanceBefore2
        ).to.be.eq(balanceIncomeContractUBILinearInstanceAfter2.add(FOURTH.mul(TENIN18)));

    });
    }
  
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+(FactoryMode ? "Factory " : "")+'test UBI(short)', async () => {
        let avg1,avg2,avg3,tmp,tmp1,balanceAccountTwoBefore,balanceAccountTwoAfter,avgRatio,ubiVal,timePassed;
        if (FactoryMode == true) {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,string,uint256,uint256)"](
                ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                UBIROLE,
                UBIQuantity,
                UBIPeriod
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractUBILinearInstance = await ethers.getContractAt("IncomeContractUBILinear",instance);
        } else {
        
            await IncomeContractUBILinearInstance.connect(owner).init(
                ERC20MintableToken.address, 
                CommunityMockInstance.address, 
                UBIROLE,
                UBIQuantity,
                UBIPeriod
            );
        }

        if (trustedForwardMode) {
            await IncomeContractUBILinearInstance.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await ERC20MintableToken.connect(owner).mint(IncomeContractUBILinearInstance.address, TEN.mul(TENIN18));

        let SomeExternalContractMockFactory = await ethers.getContractFactory("SomeExternalContractMock");

        var SomeExternalContractMockInstance = await SomeExternalContractMockFactory.connect(owner).deploy(IncomeContractUBILinearInstance.address);

        // make first actualize ubi
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'actualizeUBI()', []);

        timePassed = 6*60*60 // 6 hours
        passTime(timePassed);

        ubiVal = (BigNumber.from(timePassed).div(UBIPeriod)).mul(UBIQuantity);
        //---------------------------------------

        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();

        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

  
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore.add(ubiVal));
        
        
        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'claimUBI()', [], "Amount exceeds balance available to claim");
        //---------------------------------------------------------------------------
        
        
        // pass another 3 hours
        timePassed = 3*60*60
        passTime(timePassed);

        ubiVal = (BigNumber.from(timePassed).div(UBIPeriod)).mul(UBIQuantity);

        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        
        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);

        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'claimUBI()', []);
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore.add(ubiVal));
        
        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        

        // pass another 3 hours. try to claim and should be reverted with message "There are no enough funds at contract"
        // 10-6-3-3=-2
        timePassed = 3*60*60
        passTime(timePassed);

        await mixedCall(IncomeContractUBILinearInstance, trustedForwardMode, accountFive, 'claimUBI()', [], "There are no enough funds at contract");

    });
    }  
    }    


    describe("TrustedForwarder", function () {
        var IncomeContractUBILinearInstance;
        beforeEach("deploying", async() => {
            let tx = await IncomeContractFactory.connect(owner)["produce(address,address,string,uint256,uint256)"](
                ZERO_ADDRESS,
                CommunityMockInstance.address, 
                UBIROLE,
                UBIQuantity,
                UBIPeriod
            );
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
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
