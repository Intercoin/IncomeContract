const BigNumber = require('bignumber.js');
const util = require('util');
const IncomeContractMock = artifacts.require("IncomeContractMock");
const ERC20MintableToken = artifacts.require("ERC20Mintable");
const truffleAssert = require('truffle-assertions');
const helper = require("../helpers/truffleTestHelper");

contract('IncomeContract', (accounts) => {
    
    // it("should assert true", async function(done) {
    //     await TestExample.deployed();
    //     assert.isTrue(true);
    //     done();
    //   });
    
    // Setup accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];  
    const accountThree = accounts[2];
    const accountFourth= accounts[3];
    const accountFive = accounts[4];
    const accountSix = accounts[5];
    const accountSeven = accounts[6];
    const accountEight = accounts[7];
    const accountNine = accounts[8];
    const accountTen = accounts[9];
    const accountEleven = accounts[10];
    const accountTwelwe = accounts[11];

   
    // setup useful values
    const oneEther = 1000000000000000000; // 1eth
    const zeroAddress = "0x0000000000000000000000000000000000000000";
   
    it('tests simple lifecycle (ETH)', async () => {
        
        var incomeContractMockInstance = await IncomeContractMock.new(zeroAddress, {from: accountTen});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.addRecipient(accountOne),
            "Ownable: caller is not the owner"
        );
         
        await incomeContractMockInstance.addRecipient(accountOne, {from: accountTen});
        
        await incomeContractMockInstance.send('0x'+(10*oneEther).toString(16), { from: accountTen});

                                                  // recipient, manager
        await incomeContractMockInstance.addManager(accountOne, accountFive, { from: accountTen});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.addManager(accountFourth,accountFive),
            "Ownable: caller is not the owner"
        );
        
        //var timeNow = parseInt(new Date().getTime()/1000);
        let block = await web3.eth.getBlock("latest");
        let timeNow = block.timestamp;
        
        let t = [];
        t.push({
            amount: '0x'+(2*oneEther).toString(16), 
            untilTime: timeNow+1*60*60, 
            gradual: false
        });
        t.push({
            amount: '0x'+(2*oneEther).toString(16), 
            untilTime: timeNow+2*60*60, 
            gradual: false
        });
        t.push({
            amount: '0x'+(2*oneEther).toString(16), 
            untilTime: timeNow+3*60*60, 
            gradual: false
        });
        
        
        await incomeContractMockInstance.setLockup(accountOne, t, { from: accountTen});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        
        // pass 1 hour
        advanceTimeAndBlock(1*60*60);
        // reverts  because manager didn't pay yet
        await truffleAssert.reverts(
            incomeContractMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );

        await incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});

        let balanceincomeContractMockInstanceBefore = (await web3.eth.getBalance(incomeContractMockInstance.address));
        let balanceAccountOneBefore = (await web3.eth.getBalance(accountOne));

        // now recipient can claim
        let claimTxObj = await incomeContractMockInstance.claim({ from: accountOne});
        let claimTx = await web3.eth.getTransaction(claimTxObj.tx);
        
        let balanceAccountOneAfter = (await web3.eth.getBalance(accountOne));
        let balanceincomeContractMockInstanceAfter = (await web3.eth.getBalance(incomeContractMockInstance.address));        
        
// t2 = await incomeContractMockInstance.viewLockup(accountOne, { from: accountTen});
// console.log('maximum = ', t2.maximum.toString());
// console.log('payed = ', t2.payed.toString());
// console.log('locked = ', t2.locked.toString());            
            
        assert.equal(
            (
                BigNumber(parseInt(balanceAccountOneBefore))
                .plus(BigNumber(parseInt(2*oneEther)))
                .minus(
                	BigNumber(parseInt(claimTxObj["receipt"].gasUsed))
                	.times(BigNumber(parseInt(claimTx.gasPrice)))
                )
            ).toString(16),
            (
                BigNumber(parseInt(balanceAccountOneAfter))
            ).toString(16),
            'Balance accountOne wrong after claim'
        );
        
        assert.equal(
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceBefore))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceAfter))
                .plus(BigNumber(parseInt(2*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after claim'
        );
        
        
        // reverts. recipient already got own 2 eth for first hour
        await truffleAssert.reverts(
            incomeContractMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await truffleAssert.reverts(
            incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        // pass another 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await truffleAssert.reverts(
            incomeContractMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        
        // manager pay send 2 eth
        await incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // pass last 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now for recipient avaialble 4 eth
        
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await truffleAssert.reverts(
            incomeContractMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available allowed balance by manager'
        );
        
        // so pay only 2 eth left
        await incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // recipient want to claim 4 eth
        let balanceincomeContractMockInstanceBefore2 = (await web3.eth.getBalance(incomeContractMockInstance.address));
        let balanceAccountOneBefore2 = (await web3.eth.getBalance(accountOne));

        let claimTxObj2 = await incomeContractMockInstance.claim({ from: accountOne});
        let claimTx2 = await web3.eth.getTransaction(claimTxObj2.tx);
        
        let balanceAccountOneAfter2 = (await web3.eth.getBalance(accountOne));
        let balanceincomeContractMockInstanceAfter2 = (await web3.eth.getBalance(incomeContractMockInstance.address));

        assert.equal(
            (
                (BigNumber(parseInt(balanceAccountOneBefore2)))
                .plus(BigNumber(parseInt(4*oneEther)))
                .minus(
                	(BigNumber(parseInt(claimTxObj2["receipt"].gasUsed)))
                	.times(BigNumber(parseInt(claimTx2.gasPrice)))
                )
            ).toString(16),
            (
                BigNumber(parseInt(balanceAccountOneAfter2))
            ).toString(16),
            'Balance accountOne wrong after last claim'
        );

        
        assert.equal(
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceBefore2))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceAfter2))
                .plus(BigNumber(parseInt(4*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after last claim'
        );
        
    });
    
    it('tests simple lifecycle (ERC20)', async () => {
        
        var ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2', {from: accountTen});
        
        var incomeContractMockInstance = await IncomeContractMock.new(ERC20MintableTokenInstance.address, {from: accountTen});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.addRecipient(accountOne),
            "Ownable: caller is not the owner"
        );
         
        await incomeContractMockInstance.addRecipient(accountOne, {from: accountTen});
        
        await ERC20MintableTokenInstance.mint(incomeContractMockInstance.address, '0x'+(10*oneEther).toString(16), { from: accountTen});

                                                  // recipient, manager
        await incomeContractMockInstance.addManager(accountOne, accountFive, { from: accountTen});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.addManager(accountFourth,accountFive),
            "Ownable: caller is not the owner"
        );
        
        //let timeNow = parseInt(new Date().getTime()/1000);
        let block = await web3.eth.getBlock("latest");
        let timeNow = block.timestamp;
        
        let t = [];
        t.push({
            amount: '0x'+(2*oneEther).toString(16), 
            untilTime: timeNow+1*60*60, 
            gradual: false
        });
        t.push({
            amount: '0x'+(2*oneEther).toString(16), 
            untilTime: timeNow+2*60*60, 
            gradual: false
        });
        t.push({
            amount: '0x'+(2*oneEther).toString(16), 
            untilTime: timeNow+3*60*60, 
            gradual: false
        });
        
        
        await incomeContractMockInstance.setLockup(accountOne, t, { from: accountTen});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        
        // pass 1 hour
        advanceTimeAndBlock(1*60*60);
        // reverts  because manager didn't pay yet
        await truffleAssert.reverts(
            incomeContractMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );

        await incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});

//const accountTwoStartingBalance = (await ERC20MintableTokenInstance.balanceOf.call(accountTwo));
        let balanceincomeContractMockInstanceBefore = (await ERC20MintableTokenInstance.balanceOf.call(incomeContractMockInstance.address));
        let balanceAccountOneBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));

        // now recipient can claim
        await incomeContractMockInstance.claim({ from: accountOne});

        let balanceAccountOneAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));
        let balanceincomeContractMockInstanceAfter = (await ERC20MintableTokenInstance.balanceOf.call(incomeContractMockInstance.address));        
        
// t2 = await incomeContractMockInstance.viewLockup(accountOne, { from: accountTen});
// console.log('maximum = ', t2.maximum.toString());
// console.log('payed = ', t2.payed.toString());
// console.log('locked = ', t2.locked.toString());            
            
        assert.equal(
            (
                BigNumber(parseInt(balanceAccountOneBefore))
                .plus(BigNumber(parseInt(2*oneEther)))
            ).toString(16),
            (
                BigNumber(parseInt(balanceAccountOneAfter))
            ).toString(16),
            'Balance accountOne wrong after claim'
        );
        
        assert.equal(
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceBefore))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceAfter))
                .plus(BigNumber(parseInt(2*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after claim'
        );
        
        
        // reverts. recipient already got own 2 eth for first hour
        await truffleAssert.reverts(
            incomeContractMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await truffleAssert.reverts(
            incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        // pass another 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await truffleAssert.reverts(
            incomeContractMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        
        // manager pay send 2 eth
        await incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // pass last 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now for recipient avaialble 4 eth
        
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await truffleAssert.reverts(
            incomeContractMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available allowed balance by manager'
        );
        
        // so pay only 2 eth left
        await incomeContractMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // recipient want to claim 4 eth
        let balanceincomeContractMockInstanceBefore2 = (await ERC20MintableTokenInstance.balanceOf.call(incomeContractMockInstance.address));
        let balanceAccountOneBefore2 = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));

        await incomeContractMockInstance.claim({ from: accountOne});
        
        let balanceAccountOneAfter2 = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));
        let balanceincomeContractMockInstanceAfter2 = (await ERC20MintableTokenInstance.balanceOf.call(incomeContractMockInstance.address));

        assert.equal(
            (
                (BigNumber(parseInt(balanceAccountOneBefore2)))
                .plus(BigNumber(parseInt(4*oneEther)))
            ).toString(16),
            (
                BigNumber(parseInt(balanceAccountOneAfter2))
            ).toString(16),
            'Balance accountOne wrong after last claim'
        );

        
        assert.equal(
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceBefore2))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceAfter2))
                .plus(BigNumber(parseInt(4*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after last claim'
        );
        
    }); 
    
    it('test error enough funds. adding and clamin afterwards ', async () => {
        var ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2', {from: accountTen});
        var incomeContractMockInstance = await IncomeContractMock.new(ERC20MintableTokenInstance.address, {from: accountTen});
        await incomeContractMockInstance.addRecipient(accountOne, {from: accountTen});
        await incomeContractMockInstance.addRecipient(accountTwo, {from: accountTen});
        await ERC20MintableTokenInstance.mint(incomeContractMockInstance.address, '0x'+(10*oneEther).toString(16), { from: accountTen});
        await incomeContractMockInstance.addManager(accountOne, accountFive, { from: accountTen});
        await incomeContractMockInstance.addManager(accountTwo, accountFive, { from: accountTen});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.addManager(accountFourth,accountFive),
            "Ownable: caller is not the owner"
        );
        
        //let timeNow = parseInt(new Date().getTime()/1000);
        let block = await web3.eth.getBlock("latest");
        let timeNow = block.timestamp;
        
        let t = [];
        t.push({
            amount: '0x'+(8*oneEther).toString(16), 
            untilTime: timeNow+1*60*60, 
            gradual: false
        });

        await incomeContractMockInstance.setLockup(accountOne, t, { from: accountTen});
        await incomeContractMockInstance.setLockup(accountTwo, t, { from: accountTen});
        
        // pass 1 hour
        advanceTimeAndBlock(1*60*60);
        
        await incomeContractMockInstance.pay(accountOne, '0x'+(8*oneEther).toString(16), { from: accountFive});
        await incomeContractMockInstance.pay(accountTwo, '0x'+(8*oneEther).toString(16), { from: accountFive});
        
        await incomeContractMockInstance.claim({ from: accountOne});
        
        await truffleAssert.reverts(
            incomeContractMockInstance.claim({ from: accountTwo}),
            "There are no enough funds at contract"
        );
        
        await ERC20MintableTokenInstance.mint(incomeContractMockInstance.address, '0x'+(6*oneEther).toString(16), { from: accountTen});
        
        
        let balanceincomeContractMockInstanceBefore = (await ERC20MintableTokenInstance.balanceOf.call(incomeContractMockInstance.address));
        let balanceAccountTwoBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountTwo));

        // now recipient can claim
        await incomeContractMockInstance.claim({ from: accountTwo});

        let balanceAccountTwoAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountTwo));
        let balanceincomeContractMockInstanceAfter = (await ERC20MintableTokenInstance.balanceOf.call(incomeContractMockInstance.address));    
        
        assert.equal(
            (
                BigNumber(parseInt(balanceAccountTwoBefore))
                .plus(BigNumber(parseInt(8*oneEther)))
            ).toString(16),
            (
                BigNumber(parseInt(balanceAccountTwoAfter))
            ).toString(16),
            'Balance accountOne wrong after claim'
        );
        
        assert.equal(
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceBefore))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceincomeContractMockInstanceAfter))
                .plus(BigNumber(parseInt(8*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after claim'
        );
        
    });
    
});
