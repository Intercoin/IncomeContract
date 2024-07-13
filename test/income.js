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
const FOUR = BigInt('4');
const SIX = BigInt('6');
const EIGHT = BigInt('8');
const NINE = BigInt('9');
const TEN = BigInt('10');
const HUN = BigInt('100');

const TENIN18 = ethers.parseEther('1');

const FRACTION = BigInt('100000');
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

describe("income",  function() {

    // vars
    var ERC20TokenFactory, IncomeContractMockFactory;
    var IncomeContractMock, ERC20MintableToken;
    var ReleaseManagerFactoryF;
    var ReleaseManagerF;

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
        ERC20MintableToken = await ERC20TokenFactory.connect(owner).deploy('t2','t2');

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

        let tx = await IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address)"](
            salt,
            (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target
        );

        let rc = await tx.wait(); // 0ms, as tx is already confirmed
        let event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        //let [instance,] = event.args;


        await expect(
            IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address)"](
                salt,
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target
            )
        ).to.be.revertedWith('ERC1167: create2 failed');

        expect(await IncomeContractFactory.connect(owner).instancesCount()).to.be.eq(ONE);
    });
    }
    
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+"Factory tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {

        let tx = await IncomeContractFactory.connect(owner)["produce(address)"]((ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.target);
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        const [instance,] = event.args;

        IncomeContractMock = await ethers.getContractAt("IncomeContractMock",instance);
        

        if (trustedForwardMode) {
            await IncomeContractMock.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'addRecipient(address)', [accountOne.address], "Ownable: caller is not the owner");

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addRecipient(address)', [accountOne.address]);

        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractMock.target, value: TEN * (TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractMock.target, TEN * (TENIN18));
        }
                                                                                                             // recipient, manager
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'addManager(address,address)', [accountFourth.address, accountFive.address], "Ownable: caller is not the owner");

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

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountOne.address, t]);
        
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // pass 1 hour
        await ethers.provider.send('evm_increaseTime', [1*60*60]);
        await ethers.provider.send('evm_mine');
        // reverts  because manager didn't pay yet
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);

        let balanceIncomeContractMockBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.target) : (await ERC20MintableToken.balanceOf(IncomeContractMock.target));

        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', []);
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractMockAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.target) : (await ERC20MintableToken.balanceOf(IncomeContractMock.target));
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
            balanceIncomeContractMockBefore
        ).to.be.eq(balanceIncomeContractMockAfter + (TWO * (TENIN18)));
        
        
        // reverts. recipient already got own 2 eth for first hour
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)], "AMOUNT_EXCEEDS_BALANCE");


        // pass another 1 hour
        await passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, FOUR * (TENIN18)], "AMOUNT_EXCEEDS_BALANCE");
        
        // manager pay send 2 eth
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);
        
        // pass last 1 hour
        await passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
       
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, FOUR * (TENIN18)], "AMOUNT_EXCEEDS_RATE");
        
        // so pay only 2 eth left
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, TWO * (TENIN18)]);
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractMockBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.target) : (await ERC20MintableToken.balanceOf(IncomeContractMock.target));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', []);
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractMockAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.target) : (await ERC20MintableToken.balanceOf(IncomeContractMock.target));
        let balanceAccountOneAfter2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // wrong claim
        expect(
            balanceAccountOneBefore2
                 + (FOUR * (TENIN18))
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
            balanceIncomeContractMockBefore2
        ).to.be.eq(balanceIncomeContractMockAfter2 + (FOUR * (TENIN18)));

    });
    }
    
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+("Factory test error enough funds. adding and clamin afterwards "), async () => {

        let tx = await IncomeContractFactory.connect(owner)["produce(address)"](ERC20MintableToken.target);
        const rc = await tx.wait(); // 0ms, as tx is already confirmed
        const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
        const [instance,] = event.args;

        IncomeContractMock = await ethers.getContractAt("IncomeContractMock",instance);

        if (trustedForwardMode) {
            await IncomeContractMock.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addRecipient(address)', [accountOne.address]);
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addRecipient(address)', [accountTwo.address]);
        await ERC20MintableToken.connect(owner).mint(IncomeContractMock.target, TEN * (TENIN18));
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'addManager(address,address)', [accountTwo.address, accountFive.address]);
        
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountNine, 'addManager(address,address)', [accountFourth.address, accountFive.address], "Ownable: caller is not the owner");

        let blockNumber = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(blockNumber);
        let timeNow = block.timestamp;
        
        let t1 = [];
        let t2 = [];
        t1.push({
            amount: EIGHT * (TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false, 
            fraction: FRACTION
        });
        
        t2.push({
            amount: EIGHT * (TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false, 
            fraction: FRACTION / (TWO)
            //fraction: FRACTION
        });

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountOne.address, t1]);
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountTwo.address, t2]);
        
        // pass 1 hour
        await passTime(1*60*60);

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountOne.address, EIGHT * (TENIN18)]);
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountFive, 'pay(address,uint256)', [accountTwo.address, EIGHT * (TENIN18)]);

        let balanceAccountOneBefore = await ERC20MintableToken.balanceOf(accountOne.address);
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountOne, 'claim()', []);
        let balanceAccountOneAfter = await ERC20MintableToken.balanceOf(accountOne.address);

        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountTwo, 'claim()', [], "NOT_ENOUGH_FUNDS");

        await ERC20MintableToken.connect(owner).mint(IncomeContractMock.target, SIX * (TENIN18));
        
        let balanceIncomeContractMockBefore = await ERC20MintableToken.balanceOf(IncomeContractMock.target);
        
        let balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountTwo.address);

        // now recipient can claim
        await mixedCall(IncomeContractMock, (trustedForwardMode ? trustedForwarder : trustedForwardMode), accountTwo, 'claim()', []);

        let balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountTwo.address);
        let balanceIncomeContractMockAfter = await ERC20MintableToken.balanceOf(IncomeContractMock.target);

        //'Balance accountOne wrong after claim'
        //expect(balanceAccountOneAfter + (EIGHT * (TENIN18))).to.be.eq(balanceAccountOneBefore);
        expect(balanceAccountTwoBefore + (EIGHT * (TENIN18))).to.be.eq(balanceAccountTwoAfter);
        
        // 'Balance at Contract wrong after claim'
        expect(balanceIncomeContractMockBefore).to.be.eq(balanceIncomeContractMockAfter + (EIGHT * (TENIN18)));
    });

    }

    describe("TrustedForwarder", function () {
        var IncomeContractMock;
        beforeEach("deploying", async() => {
            let tx = await IncomeContractFactory.connect(owner)["produce(address)"](ERC20MintableToken.target);
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.logs.find(event => event.fragment && event.fragment.name=== 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractMock = await ethers.getContractAt("IncomeContractMock",instance);
        });
        it("should be empty after init", async() => {
            expect(await IncomeContractMock.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("should be setup by owner", async() => {
            await expect(IncomeContractMock.connect(accountOne).setTrustedForwarder(accountTwo.address)).to.be.revertedWith("Ownable: caller is not the owner");
            expect(await IncomeContractMock.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
            await IncomeContractMock.connect(owner).setTrustedForwarder(accountTwo.address);
            expect(await IncomeContractMock.connect(accountOne).isTrustedForwarder(accountTwo.address)).to.be.true;
        });
        
        it("should drop trusted forward if trusted forward become owner ", async() => {
            await IncomeContractMock.connect(owner).setTrustedForwarder(accountTwo.address);
            expect(await IncomeContractMock.connect(accountOne).isTrustedForwarder(accountTwo.address)).to.be.true;
            await IncomeContractMock.connect(owner).transferOwnership(accountTwo.address);
            expect(await IncomeContractMock.connect(accountOne).isTrustedForwarder(ZERO_ADDRESS)).to.be.true;
        });

        it("shouldnt become owner and trusted forwarder", async() => {
            await expect(IncomeContractMock.connect(owner).setTrustedForwarder(owner.address)).to.be.revertedWith("FORWARDER_CAN_NOT_BE_OWNER");
        });
        
    });
});

