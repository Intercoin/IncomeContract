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
const NINE = BigNumber.from('9');
const TEN = BigNumber.from('10');
const HUN = BigNumber.from('100');

const TENIN18 = TEN.pow(BigNumber.from('18'));

const FRACTION = BigNumber.from('100000');

chai.use(require('chai-bignumber')());

describe("itrx", function () {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const accountOne = accounts[1];
    const accountFourth = accounts[4];
    const accountFive = accounts[5];

    // vars
    var IncomeContractMock, IncomeContractMockFactory;
    var ERC20MintableToken, ERC20MintableTokenFactory;

    beforeEach("deploying", async() => {
        IncomeContractMockFactory = await ethers.getContractFactory("IncomeContractMock");
        IncomeContractMock = await IncomeContractMockFactory.connect(owner).deploy();
        ERC20MintableTokenFactory = await ethers.getContractFactory("ERC20Mintable");
    });
    for ( const ETHMode of [true, false]) {
    it("tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {
        
        if (ETHMode) {
            await IncomeContractMock.connect(owner).__IncomeContract_init(ZERO_ADDRESS);
        } else {
            ERC20MintableToken = await ERC20MintableTokenFactory.connect(owner).deploy('t2','t2');
            if (!ETHMode) { return;}
            await IncomeContractMock.connect(owner).__IncomeContract_init(ERC20MintableToken.address);
        }

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



        let balanceIncomeContractMockBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf.call(IncomeContractMock.address));
        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf.call(accountOne.address));

        // now recipient can claim
        let claimTxObj = await IncomeContractMock.connect(accountOne).claim();
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractMockAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf.call(IncomeContractMock.address));
        let balanceAccountOneAfter = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf.call(accountOne.address));
        
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
        await ethers.provider.send('evm_increaseTime', [1*60*60]);
        await ethers.provider.send('evm_mine');
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await expect(
            IncomeContractMock.connect(accountFive).pay(accountOne.address, FOURTH.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available unlocked balance");
        
        // manager pay send 2 eth
        await IncomeContractMock.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        
        // pass last 1 hour
        await ethers.provider.send('evm_increaseTime', [1*60*60]);
        await ethers.provider.send('evm_mine');
        
        // now for recipient avaialble 4 eth
       
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await expect(
            IncomeContractMock.connect(accountFive).pay(accountOne.address, FOURTH.mul(TENIN18))
        ).to.be.revertedWith("Amount exceeds available allowed balance by manager");
        
        // so pay only 2 eth left
        await IncomeContractMock.connect(accountFive).pay(accountOne.address, TWO.mul(TENIN18))
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractMockBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf.call(IncomeContractMock.address));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf.call(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await IncomeContractMock.connect(accountOne).claim();
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractMockAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf.call(IncomeContractMock.address));
        let balanceAccountOneAfter2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf.call(accountOne.address));

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
    
   

});

    
    
//     it('test error enough funds. adding and clamin afterwards ', async () => {
//         var ERC20MintableToken = await ERC20MintableToken.new('t2','t2', {from: accountTen});
//         var IncomeContractMock = await IncomeContractMock.new({from: accountTen});
//         await IncomeContractMock.__IncomeContract_init(ERC20MintableToken.address, {from: accountTen});
        
//         await IncomeContractMock.addRecipient(accountOne, {from: accountTen});
//         await IncomeContractMock.addRecipient(accountTwo, {from: accountTen});
//         await ERC20MintableToken.mint(IncomeContractMock.address, '0x'+(10*oneEther).toString(16), { from: accountTen});
//         await IncomeContractMock.addManager(accountOne, accountFive, { from: accountTen});
//         await IncomeContractMock.addManager(accountTwo, accountFive, { from: accountTen});
        
//         await expect(
//             IncomeContractMock.addManager(accountFourth,accountFive),
//             "Ownable: caller is not the owner"
//         );
        
//         //let timeNow = parseInt(new Date().getTime()/1000);
//         let block = await web3.eth.getBlock("latest");
//         let timeNow = block.timestamp;
        
//         let t = [];
//         t.push({
//             amount: '0x'+(8*oneEther).toString(16), 
//             untilTime: timeNow+1*60*60, 
//             gradual: false
//         });

//         await IncomeContractMock.setLockup(accountOne, t, { from: accountTen});
//         await IncomeContractMock.setLockup(accountTwo, t, { from: accountTen});
        
//         // pass 1 hour
//         advanceTimeAndBlock(1*60*60);
        
//         await IncomeContractMock.pay(accountOne, '0x'+(8*oneEther).toString(16), { from: accountFive});
//         await IncomeContractMock.pay(accountTwo, '0x'+(8*oneEther).toString(16), { from: accountFive});
        
//         await IncomeContractMock.claim({ from: accountOne});
        
//         await expect(
//             IncomeContractMock.claim({ from: accountTwo}),
//             "There are no enough funds at contract"
//         );
        
//         await ERC20MintableToken.mint(IncomeContractMock.address, '0x'+(6*oneEther).toString(16), { from: accountTen});
        
        
//         let balanceIncomeContractMockBefore = (await ERC20MintableToken.balanceOf.call(IncomeContractMock.address));
//         let balanceAccountTwoBefore = (await ERC20MintableToken.balanceOf.call(accountTwo));

//         // now recipient can claim
//         await IncomeContractMock.claim({ from: accountTwo});

//         let balanceAccountTwoAfter = (await ERC20MintableToken.balanceOf.call(accountTwo));
//         let balanceIncomeContractMockAfter = (await ERC20MintableToken.balanceOf.call(IncomeContractMock.address));    
        
//         assert.equal(
//             (
//                 BigNumber(parseInt(balanceAccountTwoBefore))
//                 .plus(BigNumber(parseInt(8*oneEther)))
//             ).toString(16),
//             (
//                 BigNumber(parseInt(balanceAccountTwoAfter))
//             ).toString(16),
//             'Balance accountOne wrong after claim'
//         );
        
//         assert.equal(
//             (
//                 BigNumber(parseInt(balanceIncomeContractMockBefore))
                
//             ).toString(16),
//             (
//                 BigNumber(parseInt(balanceIncomeContractMockAfter))
//                 .plus(BigNumber(parseInt(8*oneEther)))
//             ).toString(16),
//             'Balance at Contract wrong after claim'
//         );
        
//     });
    
// });
