require('dotenv').config()

require("@nomiclabs/hardhat-ethers")
// require("hardhat-docgen")
// require("@hardhat-docgen/core")
// //require("@hardhat-docgen/markdown")
// require("./docgen-custom-markdown")
require('hardhat-deploy')
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-web3")
require("@nomiclabs/hardhat-etherscan")
require("solidity-coverage")
require("hardhat-gas-reporter")


const kovanURL = `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_KOVAN}`
const goerliURL = `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_GOERLI}`
const rinkebyURL = /*`https://rinkeby.infura.io/v3/${process.env.INFURA_ID_PROJECT}` */`https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY}`
const bscURL = 'https://bsc-dataseed.binance.org' //`https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY}`
const bsctestURL = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const mainnetURL = `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET}`
const maticURL = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MATIC}`




module.exports = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      //[mainnetURL]
      chainId: 1,
      forking: {url: mainnetURL}
      // //[bscURL]
      // chainId: 56,
      // forking: {url: bscURL}
      // //[maticURL]
      // chainId: 137,
      // forking: {url: maticURL}
    },

    bsc: {
      url: bscURL,
      chainId: 56,
      //gasPrice: "auto",
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_income
      ],
      saveDeployments: true
    },
    bsctest: {
      url: bsctestURL,
      chainId: 97,
      //gasPrice: "auto",
      accounts: [process.env.private_key],
      saveDeployments: true
    },
    matic: {
      url: maticURL,
      chainId: 137,
      //gasPrice: "auto",
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_income
      ],
      saveDeployments: true
    },
    mainnet: {
      url: mainnetURL,
      chainId: 1,
      gasPrice: 3_000000000,
      accounts: [
        process.env.private_key,
        process.env.private_key_auxiliary,
        process.env.private_key_releasemanager,
        process.env.private_key_income
      ],
      saveDeployments: true
    }
  },
  // docgen: {
  //   path: './docs',
  //   clear: true,
  //   only: ['contracts/v2'],
  //   theme: '../../docgen-custom-markdown',
  //   runOnCompile: false,
  // },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: {
      polygon: process.env.MATIC_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY
    }
  },
  solidity: {
    compilers: [
        {
          version: "0.8.13",
          settings: {
            optimizer: {
              enabled: true,
              runs: 100,
            },
            metadata: {
              // do not include the metadata hash, since this is machine dependent
              // and we want all generated code to be deterministic
              // https://docs.soliditylang.org/en/v0.7.6/metadata.html
              bytecodeHash: "none",
            },
          },
        },
        {
          version: "0.8.11",
          settings: {
            optimizer: {
              enabled: true,
              runs: 100,
            },
            metadata: {
              // do not include the metadata hash, since this is machine dependent
              // and we want all generated code to be deterministic
              // https://docs.soliditylang.org/en/v0.7.6/metadata.html
              bytecodeHash: "none",
            },
          },
        }
      ],
  
    
  },

  namedAccounts: {
    deployer: 0,
    },

  paths: {
    sources: "./contracts",
  },
  gasReporter: {
    currency: 'USD',
    enabled: (process.env.REPORT_GAS === "true") ? true : false
  },
  mocha: {
    timeout: 200000
  }
 
}
