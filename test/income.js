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

describe("income",  async() => {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const accountOne = accounts[1];
    const accountTwo  = accounts[2];
    const accountFourth = accounts[4];
    const accountFive = accounts[5];
    const accountNine = accounts[9];

    // vars
    var ERC20TokenFactory, IncomeContractMockFactory;
    var IncomeContractMock, ERC20MintableToken;
    beforeEach("deploying", async() => {
        IncomeContractMockFactory = await ethers.getContractFactory("IncomeContractMock");
        ERC20TokenFactory = await ethers.getContractFactory("ERC20Mintable");

        IncomeContractMock = await IncomeContractMockFactory.connect(owner).deploy();
        ERC20MintableToken = await ERC20TokenFactory.connect(owner).deploy('t2','t2');
    });

    for ( const ETHMode of [true, false]) {
    it("tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {

        await IncomeContractMock.connect(owner).init((ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address);

        await expect(
            IncomeContractMock.connect(accountFive).addRecipient(accountOne.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await IncomeContractMock.connect(owner).addRecipient(accountOne.address);
        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractMock.address, value: TEN.mul(TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractMock.address, TEN.mul(TENIN18));
        }
                                                  // recipient, manager
        await IncomeContractMock.connect(owner).addManager(accountOne.address, accountFive.address);

        await expect(
            IncomeContractMock.connect(accountFive).addManager(accountFourth.address, accountFive.address)
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

        await IncomeContractMock.connect(owner).setLockup(accountOne.address, t);
        
        await expect(
            IncomeContractMock.connect(accountOne).claim()
        ).to.be.revertedWith("There are no avaialbe amount to claim");
        
        // pass 1 hour
        await ethers.provider.send('evm_increaseTime', [1*60*60]);
        await ethers.provider.send('evm_mine');
        // reverts  because manager didn't pay yet
        await expect(
            IncomeContractMock.connect(accountOne).claim()
        ).to.be.revertedWith("There are no avaialbe amount to claim");

        await IncomeContractMock.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18));

        let balanceIncomeContractMockBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));

        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await IncomeContractMock.connect(accountOne).claim();
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractMockAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));
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
            balanceIncomeContractMockBefore
        ).to.be.eq(balanceIncomeContractMockAfter.add(TWO.mul(TENIN18)));
        
        
        // reverts. recipient already got own 2 eth for first hour
        await expect(
            IncomeContractMock.connect(accountOne).claim()
        ).to.be.revertedWith("There are no avaialbe amount to claim");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await expect(
            IncomeContractMock.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available unlocked balance");

        // pass another 1 hour
        passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await expect(
            IncomeContractMock.connect(accountFive).pay(accountOne.address, FOURTH.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available unlocked balance");
        
        // manager pay send 2 eth
        await IncomeContractMock.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        
        // pass last 1 hour
        passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
       
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await expect(
            IncomeContractMock.connect(accountFive).pay(accountOne.address, FOURTH.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available allowed balance by manager");
        
        // so pay only 2 eth left
        await IncomeContractMock.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractMockBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await IncomeContractMock.connect(accountOne).claim();
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractMockAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));
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
            balanceIncomeContractMockBefore2
        ).to.be.eq(balanceIncomeContractMockAfter2.add(FOURTH.mul(TENIN18)));

    });
    }
    
    
    it('test error enough funds. adding and clamin afterwards ', async () => {
        
        await IncomeContractMock.connect(owner).init(ERC20MintableToken.address);

        await IncomeContractMock.connect(owner).addRecipient(accountOne.address);
        await IncomeContractMock.connect(owner).addRecipient(accountTwo.address);
        await ERC20MintableToken.connect(owner).mint(IncomeContractMock.address, TEN.mul(TENIN18));
        await IncomeContractMock.connect(owner).addManager(accountOne.address, accountFive.address);
        await IncomeContractMock.connect(owner).addManager(accountTwo.address, accountFive.address);
        
        await expect(
            IncomeContractMock.connect(accountNine).addManager(accountFourth.address, accountFive.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
            

        let blockNumber = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(blockNumber);
        let timeNow = block.timestamp;
        
        let t = [];
        t.push({
            amount: EIGHT.mul(TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false
        });

        await IncomeContractMock.connect(owner).setLockup(accountOne.address, t);
        await IncomeContractMock.connect(owner).setLockup(accountTwo.address, t);
        
        // pass 1 hour
        await passTime(1*60*60);
         
        await IncomeContractMock.connect(accountFive).pay(accountOne.address, EIGHT.mul(TENIN18));

        await IncomeContractMock.connect(accountFive).pay(accountTwo.address, EIGHT.mul(TENIN18));

        await IncomeContractMock.connect(accountOne).claim();

        await expect(
            IncomeContractMock.connect(accountTwo).claim()
        ).to.be.revertedWith("There are no enough funds at contract");

        await ERC20MintableToken.connect(owner).mint(IncomeContractMock.address, SIX.mul(TENIN18));
        
        let balanceIncomeContractMockBefore = await ERC20MintableToken.balanceOf(IncomeContractMock.address);
        let balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountTwo.address);

        // now recipient can claim
        await IncomeContractMock.connect(accountTwo).claim();


        let balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountTwo.address);
        let balanceIncomeContractMockAfter = await ERC20MintableToken.balanceOf(IncomeContractMock.address);

        //'Balance accountOne wrong after claim'
        expect(balanceAccountTwoBefore.add(EIGHT.mul(TENIN18))).to.be.eq(balanceAccountTwoAfter);
        
        // 'Balance at Contract wrong after claim'
        expect(balanceIncomeContractMockBefore).to.be.eq(balanceIncomeContractMockAfter.add(EIGHT.mul(TENIN18)));
    });

});

