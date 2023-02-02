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
const FOUR = BigNumber.from('4');
const SIX = BigNumber.from('6');
const EIGHT = BigNumber.from('8');
const NINE = BigNumber.from('9');
const TEN = BigNumber.from('10');
const HUN = BigNumber.from('100');

const TENIN18 = TEN.pow(BigNumber.from('18'));

const FRACTION = BigNumber.from('100000');
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

describe("income",  async() => {
    const accounts = waffle.provider.getWallets();

    const owner = accounts[0];                     
    const accountOne = accounts[1];
    const accountTwo  = accounts[2];
    const accountFour = accounts[4];
    const accountFive = accounts[5];
    const accountNine = accounts[9];
    const trustedForwarder = accounts[12];

    // vars
    var ERC20TokenFactory, IncomeContractMockFactory;
    var IncomeContractMock, ERC20MintableToken;
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

    if (FactoryMode && !trustedForwardMode) {  
    it("should produce deterministic", async() => {
        const salt    = "0x00112233445566778899AABBCCDDEEFF00000000000000000000000000000000";

        let tx = await IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address)"](
            salt,
            (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address
        );

        let rc = await tx.wait(); // 0ms, as tx is already confirmed
        let event = rc.events.find(event => event.event === 'InstanceCreated');
        //let [instance,] = event.args;


        await expect(
            IncomeContractFactory.connect(owner)["produceDeterministic(bytes32,address)"](
                salt,
                (ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address
            )
        ).to.be.revertedWith('ERC1167: create2 failed');

        expect(await IncomeContractFactory.connect(owner).instancesCount()).to.be.eq(ONE);
    });
    }

    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+(FactoryMode ? "Factory " : "")+"tests simple lifecycle ("+(ETHMode ? "ETH" : "ERC20")+")", async() => {

        if (FactoryMode == true) {
            let tx = await IncomeContractFactory.connect(owner)["produce(address)"]((ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address);
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractMock = await ethers.getContractAt("IncomeContractMock",instance);
        } else {
            await IncomeContractMock.connect(owner).init((ETHMode) ? ZERO_ADDRESS : ERC20MintableToken.address);
        }

        if (trustedForwardMode) {
            await IncomeContractMock.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'addRecipient(address)', [accountOne.address], "Ownable: caller is not the owner");

        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'addRecipient(address)', [accountOne.address]);

        if (ETHMode) {
            await owner.sendTransaction({to: IncomeContractMock.address, value: TEN.mul(TENIN18)});
        } else {
            await ERC20MintableToken.connect(owner).mint(IncomeContractMock.address, TEN.mul(TENIN18));
        }
                                                                                                             // recipient, manager
        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);

        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'addManager(address,address)', [accountFour.address, accountFive.address], "Ownable: caller is not the owner");

        let blockNumber = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(blockNumber);
        timeNow = block.timestamp;

        let t = [];
        t.push({
            amount: TWO.mul(TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false, 
            fraction: FRACTION
        });
        t.push({
            amount: TWO.mul(TENIN18), 
            untilTime: timeNow+2*60*60, 
            gradual: false, 
            fraction: FRACTION
        });
        t.push({
            amount: TWO.mul(TENIN18), 
            untilTime: timeNow+3*60*60, 
            gradual: false, 
            fraction: FRACTION
        });

        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountOne.address, t]);
        
        await mixedCall(IncomeContractMock, trustedForwardMode, accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // pass 1 hour
        await ethers.provider.send('evm_increaseTime', [1*60*60]);
        await ethers.provider.send('evm_mine');
        // reverts  because manager didn't pay yet
        await mixedCall(IncomeContractMock, trustedForwardMode, accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");

        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);

        let balanceIncomeContractMockBefore = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));

        let balanceAccountOneBefore = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj = await mixedCall(IncomeContractMock, trustedForwardMode, accountOne, 'claim()', []);
        let claimTx = await claimTxObj.wait();

        let balanceIncomeContractMockAfter = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));
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
            balanceIncomeContractMockBefore
        ).to.be.eq(balanceIncomeContractMockAfter.add(TWO.mul(TENIN18)));
        
        
        // reverts. recipient already got own 2 eth for first hour
        await mixedCall(IncomeContractMock, trustedForwardMode, accountOne, 'claim()', [], "NOTHING_AVAILABLE_TO_CLAIM");
        
        // managers want to pay another 2 eth( for second hour) but reverts. it is not time
        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)], "AMOUNT_EXCEEDS_BALANCE");


        // pass another 1 hour
        passTime(1*60*60);
        
        // now available to pay another 2eth
        // manager want to pay all eth (4eth). but reverts
        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, FOUR.mul(TENIN18)], "AMOUNT_EXCEEDS_BALANCE");
        
        // manager pay send 2 eth
        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);
        
        // pass last 1 hour
        passTime(1*60*60);
        
        // now for recipient avaialble 4 eth
       
        // manager want to pay 4 eth, but 2eth of them he has already payed before. so reverts
        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, FOUR.mul(TENIN18)], "AMOUNT_EXCEEDS_RATE");
        
        // so pay only 2 eth left
        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, TWO.mul(TENIN18)]);
        
        // recipient want to claim 4 eth
        
        let balanceIncomeContractMockBefore2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));
        let balanceAccountOneBefore2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // now recipient can claim
        let claimTxObj2 = await mixedCall(IncomeContractMock, trustedForwardMode, accountOne, 'claim()', []);
        let claimTx2 = await claimTxObj2.wait();

        let balanceIncomeContractMockAfter2 = (ETHMode) ? await ethers.provider.getBalance(IncomeContractMock.address) : (await ERC20MintableToken.balanceOf(IncomeContractMock.address));
        let balanceAccountOneAfter2 = (ETHMode) ? await ethers.provider.getBalance(accountOne.address) : (await ERC20MintableToken.balanceOf(accountOne.address));

        // wrong claim
        expect(
            balanceAccountOneBefore2
                .add(FOUR.mul(TENIN18))
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
            balanceIncomeContractMockBefore2
        ).to.be.eq(balanceIncomeContractMockAfter2.add(FOUR.mul(TENIN18)));

    });
    }
    
    
    it(""+(trustedForwardMode ? '[trusted forwarder]' : '')+(FactoryMode ? "Factory " : "")+'test error enough funds. adding and clamin afterwards ', async () => {
        if (FactoryMode == true) {
            let tx = await IncomeContractFactory.connect(owner)["produce(address)"](ERC20MintableToken.address);
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
            const [instance,] = event.args;

            IncomeContractMock = await ethers.getContractAt("IncomeContractMock",instance);
        } else {
            await IncomeContractMock.connect(owner).init(ERC20MintableToken.address);
        }

        if (trustedForwardMode) {
            await IncomeContractMock.connect(owner).setTrustedForwarder(trustedForwarder.address);
        }

        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'addRecipient(address)', [accountOne.address]);
        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'addRecipient(address)', [accountTwo.address]);
        await ERC20MintableToken.connect(owner).mint(IncomeContractMock.address, TEN.mul(TENIN18));
        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'addManager(address,address)', [accountOne.address, accountFive.address]);
        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'addManager(address,address)', [accountTwo.address, accountFive.address]);
        
        await mixedCall(IncomeContractMock, trustedForwardMode, accountNine, 'addManager(address,address)', [accountFour.address, accountFive.address], "Ownable: caller is not the owner");

        let blockNumber = await ethers.provider.getBlockNumber();
        let block = await ethers.provider.getBlock(blockNumber);
        let timeNow = block.timestamp;
        
        let t1 = [];
        let t2 = [];
        t1.push({
            amount: EIGHT.mul(TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false, 
            fraction: FRACTION
        });
        
        t2.push({
            amount: EIGHT.mul(TENIN18), 
            untilTime: timeNow+1*60*60, 
            gradual: false, 
            fraction: FRACTION.div(TWO)
            //fraction: FRACTION
        });

        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountOne.address, t1]);
        await mixedCall(IncomeContractMock, trustedForwardMode, owner, 'setLockup(address,(uint256,uint256,bool,uint32)[])', [accountTwo.address, t2]);
        
        // pass 1 hour
        await passTime(1*60*60);

        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountOne.address, EIGHT.mul(TENIN18)]);
        await mixedCall(IncomeContractMock, trustedForwardMode, accountFive, 'pay(address,uint256)', [accountTwo.address, EIGHT.mul(TENIN18)]);

        let balanceAccountOneBefore = await ERC20MintableToken.balanceOf(accountOne.address);
        await mixedCall(IncomeContractMock, trustedForwardMode, accountOne, 'claim()', []);
        let balanceAccountOneAfter = await ERC20MintableToken.balanceOf(accountOne.address);

        await mixedCall(IncomeContractMock, trustedForwardMode, accountTwo, 'claim()', [], "NOT_ENOUGH_FUNDS");

        await ERC20MintableToken.connect(owner).mint(IncomeContractMock.address, SIX.mul(TENIN18));
        
        let balanceIncomeContractMockBefore = await ERC20MintableToken.balanceOf(IncomeContractMock.address);
        
        let balanceAccountTwoBefore = await ERC20MintableToken.balanceOf(accountTwo.address);

        // now recipient can claim
        await mixedCall(IncomeContractMock, trustedForwardMode, accountTwo, 'claim()', []);

        let balanceAccountTwoAfter = await ERC20MintableToken.balanceOf(accountTwo.address);
        let balanceIncomeContractMockAfter = await ERC20MintableToken.balanceOf(IncomeContractMock.address);

        //'Balance accountOne wrong after claim'
        //expect(balanceAccountOneAfter.add(EIGHT.mul(TENIN18))).to.be.eq(balanceAccountOneBefore);
        expect(balanceAccountTwoBefore.add(EIGHT.mul(TENIN18))).to.be.eq(balanceAccountTwoAfter);
        
        // 'Balance at Contract wrong after claim'
        expect(balanceIncomeContractMockBefore).to.be.eq(balanceIncomeContractMockAfter.add(EIGHT.mul(TENIN18)));
    });
    }
    }

    describe("TrustedForwarder", function () {
        var IncomeContractMock;
        beforeEach("deploying", async() => {
            let tx = await IncomeContractFactory.connect(owner)["produce(address)"](ERC20MintableToken.address);
            const rc = await tx.wait(); // 0ms, as tx is already confirmed
            const event = rc.events.find(event => event.event === 'InstanceCreated');
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

