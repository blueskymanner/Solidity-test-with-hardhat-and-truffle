const { expect } = require('chai');
const { ethers } = require('hardhat');

const { getAPIEndPoint, getCoverPremium, confirmCoverPremium } = require('../scripts/shared/insureAce');
const { advanceBlockTo, createPair, createPairETH, getBigNumber } = require('../scripts/shared/utilities');

const UNISWAPV2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const UNISWAPV2_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

// We are doing test on Ethereum mainnet hardhat
describe('InsureAcePolka', function () {
  before(async function () {
    this.InsureAcePolka = await ethers.getContractFactory('InsureAcePolka');
    this.ExchangeAgent = await ethers.getContractFactory('ExchangeAgent');
    this.MockERC20 = await ethers.getContractFactory('MockERC20');
    this.signers = await ethers.getSigners();

    /** Below parameters are hard coded just for testing. */
    // this.chainId = 1;
    // this.coverContractAddress = '0x88Ef6F235a4790292068646e79Ee563339c796a0'; // this is ETH mainnet address

    this.chainId = 4;
    this.coverContractAddress = '0x0921f628b8463227615D2199D0D3860E4fBcD411'; // this is rinkeby testnet address, @Terry checked it through test script

    this.chain = 'ETH';
    this.coverOwner = this.signers[0].address;
    // this.productIds = [4, 58]; // hardcoded at the moment - for mainnet testing
    // this.coverDays = [30, 60];  // for mainnet testing
    // this.coverAmounts = ['500000000000000000', '800000000000000000']; // for mainnet testing

    this.productIds = [55]; // for rinkeby testing
    this.coverDays = [30]; // for rinkeby testing
    this.coverAmounts = ['500000000000000000']; // for rinkeby testing

    this.coverCurrency = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    this.referralCode = null;

    this.cvr = await (await this.MockERC20.deploy('CVR', 'CVR')).deployed();

    this.mockUSDC = await (await this.MockERC20.deploy('USDC', 'USDC')).deployed();

    this.exchangeAgent = await this.ExchangeAgent.deploy(this.mockUSDC.address, WETH, UNISWAPV2_FACTORY);

    this.cvrETHPair = await createPairETH(
      UNISWAPV2_ROUTER,
      UNISWAPV2_FACTORY,
      this.cvr.address,
      getBigNumber(5000),
      getBigNumber(10),
      this.signers[0].address,
      this.signers[0]
    );

    await ethers.provider.send('eth_sendTransaction', [
      { from: this.signers[10].address, to: this.exchangeAgent.address, value: getBigNumber(10).toHexString() },
    ]);

    await this.exchangeAgent.addCurrency(this.cvr.address);
  });

  beforeEach(async function () {
    this.insureAcePolka = await (
      await this.InsureAcePolka.deploy(
        this.cvr.address, // @todo should be changed CVR
        this.exchangeAgent.address, // @todo should be changed ExcahngeAgent
        this.coverContractAddress
      )
    ).deployed();

    await this.exchangeAgent.addWhiteList(this.insureAcePolka.address);
  });

  it('Should get data from InsureAce API', async function () {
    // console.log('1. Getting premium...');
    // const premiumInfo = await getCoverPremium(this.chainId, {
    //   chain: this.chain,
    //   productIds: this.productIds,
    //   coverDays: this.coverDays,
    //   coverAmounts: this.coverAmounts,
    //   coverCurrency: this.coverCurrency,
    //   owner: this.coverOwner,
    //   referralCode: this.referralCode
    // });
    // console.log('2. Confirming cover premium');
    // const confirmInfo = await confirmCoverPremium(this.chainId, {
    //   chain: this.chain,
    //   params: premiumInfo.params,
    // });
    // console.log(`confirmInfo ${JSON.stringify(confirmInfo)}`);
  });

  it('Should buy product By ETH', async function () {
    console.log('1. Getting premium...');
    const premiumInfo = await getCoverPremium(this.chainId, {
      chain: this.chain,
      productIds: this.productIds,
      coverDays: this.coverDays,
      coverAmounts: this.coverAmounts,
      coverCurrency: this.coverCurrency,
      owner: this.coverOwner,
      referralCode: this.referralCode,
    });
    console.log('2. Confirming cover premium');
    const confirmInfo = await confirmCoverPremium(this.chainId, {
      chain: this.chain,
      params: premiumInfo.params,
    });
    const params = confirmInfo.params;
    console.log('current block', await ethers.provider.getBlockNumber());
    console.log('target block', parseInt(params[8][0]) + 2);
    await advanceBlockTo(parseInt(params[8][0]) + 2);
    await expect(
      this.insureAcePolka.buyCoverByETH(
        params[0],
        params[1],
        params[2],
        params[3],
        params[4],
        params[5],
        params[6],
        params[7],
        params[8],
        params[9],
        params[10],
        params[11],
        { value: premiumInfo.premium }
      )
    )
      .to.emit(this.insureAcePolka, 'BuyInsureAce')
      .withArgs(this.productIds, this.signers[0].address, this.coverCurrency, premiumInfo.premium);
  });

  it('Should buy product by token', async function () {
    // const premiumInfo = await getCoverPremium(this.chainId, {
    //   chain: this.chain,
    //   productIds: this.productIds,
    //   coverDays: this.coverDays,
    //   coverAmounts: this.coverAmounts,
    //   coverCurrency: this.coverCurrency,
    //   owner: this.coverOwner,
    //   referralCode: this.referralCode,
    // });
    // console.log('2. Confirming cover premium');
    // const confirmInfo = await confirmCoverPremium(this.chainId, {
    //   chain: this.chain,
    //   params: premiumInfo.params,
    // });
    // const params = confirmInfo.params;
    // await advanceBlockTo(parseInt(params[8][0]) + 2);
    // await this.cvr.approve(this.insureAcePolka.address, getBigNumber(10000000000));
    // await expect(
    //   this.insureAcePolka.buyCoverByToken(
    //     params[0],
    //     params[1],
    //     params[2],
    //     params[3],
    //     params[4],
    //     params[5],
    //     params[6],
    //     params[7],
    //     params[8],
    //     params[9],
    //     params[10],
    //     params[11]
    //   )
    // )
    //   .to.emit(this.insureAcePolka, 'BuyInsureAce')
    //   .withArgs(this.productIds, this.signers[0].address, this.coverCurrency, premiumInfo.premium);
  });
});
