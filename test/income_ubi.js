const BigNumber = require('bignumber.js');
const util = require('util');
const IncomeContractUBIMock = artifacts.require("IncomeContractUBIMock");
const SomeExternalContractMock = artifacts.require("SomeExternalContractMock");
const CommunityMock = artifacts.require("CommunityMock");
const ERC20MintableToken = artifacts.require("ERC20Mintable");
const truffleAssert = require('truffle-assertions');
const helper = require("../helpers/truffleTestHelper");

contract('IncomeContractUBI', (accounts) => {
    
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
    const oneToken = 1000000000000000000; // 1token = 1e18
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const membersRole= 'members';
    const ubiRole = 'members'
    const rateMultiplier = 1000000;
    
    it('tests simple lifecycle (ETH)', async () => {
        var CommunityMockInstance = await CommunityMock.new({from: accountTen});
        var IncomeContractUBIMockInstance = await IncomeContractUBIMock.new(zeroAddress, CommunityMockInstance.address, membersRole, ubiRole, {from: accountTen});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.addRecipient(accountOne),
            "Ownable: caller is not the owner"
        );
         
        await IncomeContractUBIMockInstance.addRecipient(accountOne, {from: accountTen});
        
        await IncomeContractUBIMockInstance.send('0x'+(10*oneEther).toString(16), { from: accountTen});

                                                  // recipient, manager
        await IncomeContractUBIMockInstance.addManager(accountOne, accountFive, { from: accountTen});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.addManager(accountFourth,accountFive),
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
        
        
        await IncomeContractUBIMockInstance.setLockup(accountOne, t, { from: accountTen});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        
        // pass 1 hour
        advanceTimeAndBlock(1*60*60);
        // reverts  because manager didn't pay yet
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );

        await IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});

        let balanceIncomeContractUBIMockInstanceBefore = (await web3.eth.getBalance(IncomeContractUBIMockInstance.address));
        let balanceAccountOneBefore = (await web3.eth.getBalance(accountOne));

        // now recipient can claim
        let claimTxObj = await IncomeContractUBIMockInstance.claim({ from: accountOne});
        let claimTx = await web3.eth.getTransaction(claimTxObj.tx);
        
        let balanceAccountOneAfter = (await web3.eth.getBalance(accountOne));
        let balanceIncomeContractUBIMockInstanceAfter = (await web3.eth.getBalance(IncomeContractUBIMockInstance.address));        
        
// t2 = await IncomeContractUBIMockInstance.viewLockup(accountOne, { from: accountTen});
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
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceBefore))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceAfter))
                .plus(BigNumber(parseInt(2*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after claim'
        );
        
        
        // reverts. recipient already got own 2 eth for first hour
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        // pass another 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        
        // manager pay send 2 eth
        await IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // pass last 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now for recipient avaialble 4 eth
        
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available allowed balance by manager'
        );
        
        // so pay only 2 eth left
        await IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // recipient want to claim 4 eth
        let balanceIncomeContractUBIMockInstanceBefore2 = (await web3.eth.getBalance(IncomeContractUBIMockInstance.address));
        let balanceAccountOneBefore2 = (await web3.eth.getBalance(accountOne));

        let claimTxObj2 = await IncomeContractUBIMockInstance.claim({ from: accountOne});
        let claimTx2 = await web3.eth.getTransaction(claimTxObj2.tx);
        
        let balanceAccountOneAfter2 = (await web3.eth.getBalance(accountOne));
        let balanceIncomeContractUBIMockInstanceAfter2 = (await web3.eth.getBalance(IncomeContractUBIMockInstance.address));

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
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceBefore2))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceAfter2))
                .plus(BigNumber(parseInt(4*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after last claim'
        );
        
    });
    
    it('tests simple lifecycle (ERC20)', async () => {
        var CommunityMockInstance = await CommunityMock.new({from: accountTen});
        var ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2', {from: accountTen});
        
        var IncomeContractUBIMockInstance = await IncomeContractUBIMock.new(ERC20MintableTokenInstance.address,  CommunityMockInstance.address, membersRole, ubiRole, {from: accountTen});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.addRecipient(accountOne),
            "Ownable: caller is not the owner"
        );
         
        await IncomeContractUBIMockInstance.addRecipient(accountOne, {from: accountTen});
        
        await ERC20MintableTokenInstance.mint(IncomeContractUBIMockInstance.address, '0x'+(10*oneEther).toString(16), { from: accountTen});

                                                  // recipient, manager
        await IncomeContractUBIMockInstance.addManager(accountOne, accountFive, { from: accountTen});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.addManager(accountFourth,accountFive),
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
        
        
        await IncomeContractUBIMockInstance.setLockup(accountOne, t, { from: accountTen});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        
        // pass 1 hour
        advanceTimeAndBlock(1*60*60);
        // reverts  because manager didn't pay yet
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );

        await IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});

//const accountTwoStartingBalance = (await ERC20MintableTokenInstance.balanceOf.call(accountTwo));
        let balanceIncomeContractUBIMockInstanceBefore = (await ERC20MintableTokenInstance.balanceOf.call(IncomeContractUBIMockInstance.address));
        let balanceAccountOneBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));

        // now recipient can claim
        await IncomeContractUBIMockInstance.claim({ from: accountOne});

        let balanceAccountOneAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));
        let balanceIncomeContractUBIMockInstanceAfter = (await ERC20MintableTokenInstance.balanceOf.call(IncomeContractUBIMockInstance.address));        
        
// t2 = await IncomeContractUBIMockInstance.viewLockup(accountOne, { from: accountTen});
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
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceBefore))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceAfter))
                .plus(BigNumber(parseInt(2*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after claim'
        );
        
        
        // reverts. recipient already got own 2 eth for first hour
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claim({ from: accountOne}),
            'There are no avaialbe amount to claim'
        );
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        // pass another 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available unlocked balance'
        );
        
        // manager pay send 2 eth
        await IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // pass last 1 hour
        advanceTimeAndBlock(1*60*60);
        
        // now for recipient avaialble 4 eth
        
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.pay(accountOne, '0x'+(4*oneEther).toString(16), { from: accountFive}),
            'Amount exceeds available allowed balance by manager'
        );
        
        // so pay only 2 eth left
        await IncomeContractUBIMockInstance.pay(accountOne, '0x'+(2*oneEther).toString(16), { from: accountFive});
        
        // recipient want to claim 4 eth
        let balanceIncomeContractUBIMockInstanceBefore2 = (await ERC20MintableTokenInstance.balanceOf.call(IncomeContractUBIMockInstance.address));
        let balanceAccountOneBefore2 = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));

        await IncomeContractUBIMockInstance.claim({ from: accountOne});
        
        let balanceAccountOneAfter2 = (await ERC20MintableTokenInstance.balanceOf.call(accountOne));
        let balanceIncomeContractUBIMockInstanceAfter2 = (await ERC20MintableTokenInstance.balanceOf.call(IncomeContractUBIMockInstance.address));

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
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceBefore2))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceAfter2))
                .plus(BigNumber(parseInt(4*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after last claim'
        );
        
    }); 
    
    it('test error enough funds. adding and clamin afterwards ', async () => {
        var CommunityMockInstance = await CommunityMock.new({from: accountTen});
        var ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2', {from: accountTen});
        var IncomeContractUBIMockInstance = await IncomeContractUBIMock.new(ERC20MintableTokenInstance.address,  CommunityMockInstance.address, membersRole, ubiRole, {from: accountTen});
        await IncomeContractUBIMockInstance.addRecipient(accountOne, {from: accountTen});
        await IncomeContractUBIMockInstance.addRecipient(accountTwo, {from: accountTen});
        await ERC20MintableTokenInstance.mint(IncomeContractUBIMockInstance.address, '0x'+(10*oneEther).toString(16), { from: accountTen});
        await IncomeContractUBIMockInstance.addManager(accountOne, accountFive, { from: accountTen});
        await IncomeContractUBIMockInstance.addManager(accountTwo, accountFive, { from: accountTen});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.addManager(accountFourth,accountFive),
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

        await IncomeContractUBIMockInstance.setLockup(accountOne, t, { from: accountTen});
        await IncomeContractUBIMockInstance.setLockup(accountTwo, t, { from: accountTen});
        
        // pass 1 hour
        advanceTimeAndBlock(1*60*60);
        
        await IncomeContractUBIMockInstance.pay(accountOne, '0x'+(8*oneEther).toString(16), { from: accountFive});
        await IncomeContractUBIMockInstance.pay(accountTwo, '0x'+(8*oneEther).toString(16), { from: accountFive});
        
        await IncomeContractUBIMockInstance.claim({ from: accountOne});
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claim({ from: accountTwo}),
            "There are no enough funds at contract"
        );
        
        await ERC20MintableTokenInstance.mint(IncomeContractUBIMockInstance.address, '0x'+(6*oneEther).toString(16), { from: accountTen});
        
        
        let balanceIncomeContractUBIMockInstanceBefore = (await ERC20MintableTokenInstance.balanceOf.call(IncomeContractUBIMockInstance.address));
        let balanceAccountTwoBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountTwo));

        // now recipient can claim
        await IncomeContractUBIMockInstance.claim({ from: accountTwo});

        let balanceAccountTwoAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountTwo));
        let balanceIncomeContractUBIMockInstanceAfter = (await ERC20MintableTokenInstance.balanceOf.call(IncomeContractUBIMockInstance.address));    
        
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
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceBefore))
                
            ).toString(16),
            (
                BigNumber(parseInt(balanceIncomeContractUBIMockInstanceAfter))
                .plus(BigNumber(parseInt(8*oneEther)))
            ).toString(16),
            'Balance at Contract wrong after claim'
        );
        
    });
    
    it('test UBI(short)', async () => {
        let avg1,avg2,avg3,tmp,tmp1,balanceAccountTwoBefore,balanceAccountTwoAfter,avgRatio,ubiVal;
        
        var CommunityMockInstance = await CommunityMock.new({from: accountTen});
        var ERC20MintableTokenInstance = await ERC20MintableToken.new('t2','t2', {from: accountTen});
        var IncomeContractUBIMockInstance = await IncomeContractUBIMock.new(ERC20MintableTokenInstance.address,  CommunityMockInstance.address, membersRole, ubiRole, {from: accountTen, gas: 6000000});
        await ERC20MintableTokenInstance.mint(IncomeContractUBIMockInstance.address, '0x'+(100*oneToken).toString(16), { from: accountTen});
        
        var SomeExternalContractMockInstance = await SomeExternalContractMock.new(IncomeContractUBIMockInstance.address, {from: accountTen});
        
        var ratioMultiplier = await IncomeContractUBIMockInstance.getRatioMultiplier({ from: accountTwo});
        
        
        // set ratio  0.4,0.5,0.6
        // set avg price 1 token
        await SomeExternalContractMockInstance.setRatio('price', 0.4*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setRatio('price', 0.5*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setRatio('price', 0.6*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setAvgPrice('price', '0x'+(1*oneToken).toString(16), { from: accountTwo});
        
        
        avg1 = BigNumber(0.4);
        avg2 = avg1.plus((BigNumber(0.5).minus(avg1)).div(BigNumber(10)));
        avg3 = avg2.plus((BigNumber(0.6).minus(avg2)).div(BigNumber(10)));
        avgRatio = avg3;
        ubiVal = (BigNumber(avgRatio).times(BigNumber(1)).times(BigNumber(oneToken)));
        // tmp = await IncomeContractUBIMockInstance.getStartDateIndex({from: accountFive})
        // console.log(tmp.toString(10));
        
        // pass 1 day = 86400 seconds. 
        await helper.advanceTimeAndBlock(86400);

        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(ubiVal)).toString(16),
            'UBI check is not as expected'
        );
        
        balanceAccountTwoBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        await IncomeContractUBIMockInstance.claimUBI({from: accountFive});
        balanceAccountTwoAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        
        assert.equal(
            (BigNumber(balanceAccountTwoAfter)).toString(16),
            (
                BigNumber(balanceAccountTwoBefore).plus((BigNumber(ubiVal)))
            ).toString(16),
            'balance after claim UBI is not as expected'
        );
        
        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(0)).toString(16),
            'UBI must be zero after claim'
        );
        
        await truffleAssert.reverts(
            IncomeContractUBIMockInstance.claimUBI({from: accountFive}),
            "Amount exceeds balance available to claim"
        );
        //---------------------------------------------------------------------------
        
        // pass another 1 day = 86400 seconds. 
        await helper.advanceTimeAndBlock(86400);


        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(ubiVal)).toString(16),
            'UBI check is not as expected'
        );
        
        balanceAccountTwoBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        await IncomeContractUBIMockInstance.claimUBI({from: accountFive});
        balanceAccountTwoAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        
        assert.equal(
            (BigNumber(balanceAccountTwoAfter)).toString(16),
            (
                BigNumber(balanceAccountTwoBefore).plus((BigNumber(ubiVal)))
            ).toString(16),
            'balance after claim UBI is not as expected'
        );
        
        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(0)).toString(16),
            'UBI must be zero after claim'
        );
        //---------------------------------------------------------------------------
        
        // for now try to change ratio but not price.
        // ubi value should left the same as previous
        await SomeExternalContractMockInstance.setRatio('price', 0.4*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setRatio('price', 0.5*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setRatio('price', 0.6*ratioMultiplier, { from: accountTwo});
        await helper.advanceTimeAndBlock(86400);

        avg1 = avgRatio.plus((BigNumber(0.4).minus(avgRatio)).div(BigNumber(10)));
        avg2 = avg1.plus((BigNumber(0.5).minus(avg1)).div(BigNumber(10)));
        avg3 = avg2.plus((BigNumber(0.6).minus(avg2)).div(BigNumber(10)));
        avgRatio = avg3;
        
        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(ubiVal)).toString(16),
            'UBI check is not as expected'
        );
        
        balanceAccountTwoBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        await IncomeContractUBIMockInstance.claimUBI({from: accountFive});
        balanceAccountTwoAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        
        assert.equal(
            (BigNumber(balanceAccountTwoAfter)).toString(16),
            (
                BigNumber(balanceAccountTwoBefore).plus((BigNumber(ubiVal)))
            ).toString(16),
            'balance after claim UBI is not as expected'
        );
        
        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(0)).toString(16),
            'UBI must be zero after claim'
        );
        //---------------------------------------------------------------------------
        
        // for now try to change ratio AND price.
        // ubi value should to grow up
        await SomeExternalContractMockInstance.setRatio('price', 0.4*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setRatio('price', 0.5*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setRatio('price', 0.6*ratioMultiplier, { from: accountTwo});
        await SomeExternalContractMockInstance.setAvgPrice('price', '0x'+(2*oneToken).toString(16), { from: accountTwo});
        await helper.advanceTimeAndBlock(86400);

        // avg1 = BigNumber(0.4);
        // avg2 = avg1.plus((BigNumber(0.5).minus(avg1)).div(BigNumber(10)));
        // avg3 = avg2.plus((BigNumber(0.6).minus(avg2)).div(BigNumber(10)));
        
        avg1 = avgRatio.plus((BigNumber(0.4).minus(avgRatio)).div(BigNumber(10)));
        avg2 = avg1.plus((BigNumber(0.5).minus(avg1)).div(BigNumber(10)));
        avg3 = avg2.plus((BigNumber(0.6).minus(avg2)).div(BigNumber(10)));
        avgRatio = avg3;

        ubiVal = (BigNumber(avgRatio).times(BigNumber(2)).times(BigNumber(oneToken)));

        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(ubiVal)).toString(16),
            'UBI check is not as expected'
        );
        
        balanceAccountTwoBefore = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        await IncomeContractUBIMockInstance.claimUBI({from: accountFive});
        balanceAccountTwoAfter = (await ERC20MintableTokenInstance.balanceOf.call(accountFive));
        
        assert.equal(
            (BigNumber(balanceAccountTwoAfter)).toString(16),
            (
                BigNumber(balanceAccountTwoBefore).plus((BigNumber(ubiVal)))
            ).toString(16),
            'balance after claim UBI is not as expected'
        );
        
        tmp = await IncomeContractUBIMockInstance.checkUBI({from: accountFive});
        assert.equal(
            (BigNumber(tmp)).toString(16),
            (BigNumber(0)).toString(16),
            'UBI must be zero after claim'
        );
        //---------------------------------------------------------------------------
        
        
    });
});
