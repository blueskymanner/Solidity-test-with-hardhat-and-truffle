const { expect } = require('chai');
const { ethers } = require('hardhat');

const UniswapV2Pair = require('../scripts/abis/UniswapV2Pair.json');
const CoverABI = require('../scripts/abis/Cover.json');

describe('Hardhaf folk', function () {
  before(async function () {});

  beforeEach(async function () {});

  describe('Checking hardfolking', function () {
    // it("Checking WETH(uniswap v2)_CVR pair contract", async function () {
    //   const pairContractAddress = "0xaf93ce2f26fda14d8a17c531e22ae841408c0747"; // WETH_USDC on rinkeby
    //   const contract = new ethers.Contract(pairContractAddress, JSON.stringify(UniswapV2Pair), ethers.provider);
    //   const decimals = await contract.decimals();
    //   expect(decimals).to.be.equal(18);
    //   const token0 = await contract.token0(); // CVR on rinkeby
    //   console.log(token0.toString());
    //   expect(token0).to.be.equal('0x1d505B1B28fbF456619D86760F0BB41b35B3d3f8');
    //   const token1 = await contract.token1(); // WETH on rinkeby
    //   console.log('token1]', token1);
    //   expect(token1).to.be.equal('0xc778417E063141139Fce010982780140Aa0cD5Ab');
    // });
    // it("Checking Insure Ace Cover contract", async function () {
    //   const coverContractAddress = "0x05DC45B1c03657d141696aAe0211c84818f520b3"; // WETH_USDC on rinkeby
    //   const contract = new ethers.Contract(coverContractAddress, JSON.stringify(CoverABI), ethers.provider);
    //   const smx = await contract.smx();
    //   const data = await contract.data();
    //   console.log(`smx ${smx}`);
    // });
  });
});
