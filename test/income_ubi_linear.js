const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect } = require('chai');
const chai = require('chai');
const { time } = require('@openzeppelin/test-helpers');

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
    const accountTwelwe = accounts[12];

   
    // setup useful values
    const oneEther = 1000000000000000000; // 1eth
    const oneToken = 1000000000000000000; // 1token = 1e18
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // vars
    var ERC20TokenFactory, IncomeContractUBILinearFactory, CommunityMockFactory;
    var IncomeContractUBILinearInstance, ERC20MintableToken, CommunityMockInstance;

    
    beforeEach("deploying", async() => {
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
            IncomeContractUBILinearInstance.address
        );
        //-----------------
    });
    for ( const FactoryMode of [true, false]) {

    for ( const ETHMode of [true, false]) {
    it("tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {
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
        await expect(
            IncomeContractUBILinearInstance.connect(accountFive).addRecipient(accountOne.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await IncomeContractUBILinearInstance.connect(owner).addRecipient(accountOne.address);

        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractUBILinearInstance.address, value: TEN.mul(TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractUBILinearInstance.address, TEN.mul(TENIN18));
        }
                                                  // recipient, manager
        await IncomeContractUBILinearInstance.connect(owner).addManager(accountOne.address, accountFive.address);

        await expect(
            IncomeContractUBILinearInstance.connect(accountFive).addManager(accountFourth.address, accountFive.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");

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

        await IncomeContractUBILinearInstance.connect(owner).setLockup(accountOne.address, t);
        
        await expect(
            IncomeContractUBILinearInstance.connect(accountOne).claim()
        ).to.be.revertedWith("There are no avaialbe amount to claim");
        
        // pass 1 hour
        passTime(1*60*60);

        // reverts  because manager didn't pay yet
        await expect(
            IncomeContractUBILinearInstance.connect(accountOne).claim()
        ).to.be.revertedWith("There are no avaialbe amount to claim");

        await IncomeContractUBILinearInstance.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18));

        let balanceIncomeContractUBILinearInstanceBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await IncomeContractUBILinearInstance.connect(accountOne).claim();
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractUBILinearInstanceAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
        let balanceAccountOneAfter = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));
        
        // wrong claim
        expect(
            balanceAccountOneBefore
                .add(TWO.mul(TENIN18))
                .sub(
                    (ETHMode) 
                    ?
                    claimTx.cumulativeGasUsed.mul(claimTx.effectiveGasPrice)
                    :
                    0

                )
        ).to.be.eq(balanceAccountOneAfter);

        //'Balance at Contract wrong after claim'
        expect(
            balanceIncomeContractUBILinearInstanceBefore
        ).to.be.eq(balanceIncomeContractUBILinearInstanceAfter.add(TWO.mul(TENIN18)));
        
        
        // reverts. recipient already got own 2 eth for first hour
        await expect(
            IncomeContractUBILinearInstance.connect(accountOne).claim()
        ).to.be.revertedWith("There are no avaialbe amount to claim");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await expect(
            IncomeContractUBILinearInstance.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available unlocked balance");

        // pass another 1 hour
        passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await expect(
            IncomeContractUBILinearInstance.connect(accountFive).pay(accountOne.address, FOURTH.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available unlocked balance");
        
        // manager pay send 2 eth
        await IncomeContractUBILinearInstance.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        
        // pass last 1 hour
        passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
       
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await expect(
            IncomeContractUBILinearInstance.connect(accountFive).pay(accountOne.address, FOURTH.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available allowed balance by manager");
        
        // so pay only 2 eth left
        await IncomeContractUBILinearInstance.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractUBILinearInstanceBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await IncomeContractUBILinearInstance.connect(accountOne).claim();
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractUBILinearInstanceAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractUBILinearInstance.address) : (await ERC20MintableToken.balanceOf(IncomeContractUBILinearInstance.address));
        let balanceAccountOneAfter2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // wrong claim
        expect(
            balanceAccountOneBefore2
                .add(FOURTH.mul(TENIN18))
                .sub(
                    (ETHMode) 
                    ?
                    claimTx2.cumulativeGasUsed.mul(claimTx2.effectiveGasPrice)
                    :
                    0
                )
        ).to.be.eq(balanceAccountOneAfter2);

        //'Balance at Contract wrong after claim'
        expect(
            balanceIncomeContractUBILinearInstanceBefore2
        ).to.be.eq(balanceIncomeContractUBILinearInstanceAfter2.add(FOURTH.mul(TENIN18)));

    });
    }
  
    it('test UBI(short)', async () => {
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
        await ERC20MintableToken.connect(owner).mint(IncomeContractUBILinearInstance.address, TEN.mul(TENIN18));

        let SomeExternalContractMockFactory = await ethers.getContractFactory("SomeExternalContractMock");

        var SomeExternalContractMockInstance = await SomeExternalContractMockFactory.connect(owner).deploy(IncomeContractUBILinearInstance.address);

        // make first actualize ubi
        await IncomeContractUBILinearInstance.connect(accountFive)["actualizeUBI()"]();

        timePassed = 6*60*60 // 6 hours
        passTime(timePassed);

        ubiVal = (BigNumber.from(timePassed).div(UBIPeriod)).mul(UBIQuantity);
        //---------------------------------------

        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();

        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

  
        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);
        await IncomeContractUBILinearInstance.connect(accountFive).claimUBI();
        balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountFive.address);
        
        //'balance after claim UBI is not as expected'
        expect(balanceAccountTwoAfter).to.be.eq(balanceAccountTwoBefore.add(ubiVal));
        
        
        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        //'UBI must be zero after claim'
        expect(tmp).to.be.eq(ZERO);
        
        await expect(
            IncomeContractUBILinearInstance.connect(accountFive).claimUBI()
        ).to.be.revertedWith("Amount exceeds balance available to claim");
        //---------------------------------------------------------------------------
        
        
        // pass another 3 hours
        timePassed = 3*60*60
        passTime(timePassed);

        ubiVal = (BigNumber.from(timePassed).div(UBIPeriod)).mul(UBIQuantity);

        tmp = await IncomeContractUBILinearInstance.connect(accountFive).checkUBI();
        
        // 'UBI check is not as expected'
        expect(tmp).to.be.eq(ubiVal);

        balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountFive.address);

        await IncomeContractUBILinearInstance.connect(accountFive).claimUBI();
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

        await expect(
            IncomeContractUBILinearInstance.connect(accountFive).claimUBI()
        ).to.be.revertedWith("There are no enough funds at contract");
        
    });
    }      
});
