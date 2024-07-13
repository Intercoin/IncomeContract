const fs = require('fs');
//const HDWalletProvider = require('truffle-hdwallet-provider');

function get_data(_message) {
    return new Promise(function(resolve, reject) {
        fs.readFile('./scripts/arguments.json', (err, data) => {
            if (err) {
                if (err.code == 'ENOENT' && err.syscall == 'open' && err.errno == -4058) {
					let obj = {};
					data = JSON.stringify(obj, null, "");
                    fs.writeFile('./scripts/arguments.json', data, (err) => {
                        if (err) throw err;
                        resolve(data);
                    });
                } else {
                    throw err;
                }
            } else {
            	resolve(data);
			}
        });
    });
}

async function main() {
	var data = await get_data();
    var data_object_root = JSON.parse(data);
	if (typeof data_object_root[hre.network.name] === 'undefined') {
		throw("Arguments file: missed data");
    } else if (typeof data_object_root[hre.network.name] === 'undefined') {
		throw("Arguments file: missed network data");
    }
	data_object = data_object_root[hre.network.name];
	if (
		typeof data_object.implementationIncomeContract === 'undefined' ||
		typeof data_object.implementationIncomeContractUBI === 'undefined' ||
		typeof data_object.implementationIncomeContractUBILinear === 'undefined' ||
		typeof data_object.releaseManager === 'undefined' ||
		!data_object.implementationIncomeContract ||
		!data_object.implementationIncomeContractUBI ||
		!data_object.implementationIncomeContractUBILinear ||
		!data_object.releaseManager
	) {
		throw("Arguments file: wrong addresses");
	}

	var signers = await ethers.getSigners();
    const provider = ethers.provider;
	var deployer,
        deployer_auxiliary,
        deployer_releasemanager,
        deployer_income;
    if (signers.length == 1) {
        
        deployer = signers[0];
        deployer_auxiliary = signers[0];
        deployer_releasemanager = signers[0];
        deployer_income = signers[0];
    } else {
        [
            deployer,
            deployer_auxiliary,
            deployer_releasemanager,
            deployer_income
        ] = signers;
    }
	
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	console.log(
		"Deploying contracts with the account:",
		deployer_income.address
	);

	var options = {
		//gasPrice: ethers.utils.parseUnits('50', 'gwei'), 
		//gasLimit: 5e6
	};
	
	let _params = [
		data_object.implementationIncomeContract,
		data_object.implementationIncomeContractUBI,
		data_object.implementationIncomeContractUBILinear,
		ZERO_ADDRESS, //costmanager
		data_object.releaseManager
	]
	let params = [
		..._params,
		options
	]

	const deployerBalanceBefore = await provider.getBalance(deployer_income.address);
	console.log("Account balance:", (deployerBalanceBefore).toString());

	const IncomeContractFactoryF = await ethers.getContractFactory("IncomeContractFactory");

	this.factory = await IncomeContractFactoryF.connect(deployer_income).deploy(...params);
	this.factory.waitForDeployment();

	console.log("Factory deployed at:", this.factory.target);
	console.log("with params:", [..._params]);

	console.log("registered with release manager:", data_object.releaseManager);

	const releaseManager = await ethers.getContractAt("ReleaseManager",data_object.releaseManager);
    let txNewRelease = await releaseManager.connect(deployer_releasemanager).newRelease(
        [this.factory.target], 
        [
            [
                5,//uint8 factoryIndex; 
                5,//uint16 releaseTag; 
                "0x53696c766572000000000000000000000000000000000000"//bytes24 factoryChangeNotes;
            ]
        ]
    );

    console.log('newRelease - waiting');
    await txNewRelease.wait(3);
    console.log('newRelease - mined');

	const deployerBalanceAfter = await provider.getBalance(deployer_income.address);
	console.log("Spent:", ethers.formatEther(deployerBalanceBefore - deployerBalanceAfter));
	console.log("gasPrice:", ethers.formatUnits((await network.provider.send("eth_gasPrice")), "gwei")," gwei");

	console.log('verifying');
    await hre.run("verify:verify", {address: this.factory.target, constructorArguments: _params});
}

main()
  .then(() => process.exit(0))
  .catch(error => {
	console.error(error);
	process.exit(1);
  });