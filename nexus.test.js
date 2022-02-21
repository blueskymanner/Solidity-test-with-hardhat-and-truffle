/**
 * @dev We are doing test on Ethereum Kovan hardhat
 */

const fetch = require('node-fetch');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { advanceBlockTo, createPair, createPairETH, getBigNumber } = require('../scripts/shared/utilities');

const DISTRIBUTOR_ADDRESS = '0xe77250450fc9f682edeff9f0d252836189c01b53'; // on Kovan
const UNISWAPV2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // on Kovan
const UNISWAPV2_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // on Kovan
const WETH = '0xd0a1e359811322d97991e03f863a0c30c2cf029c';
const COVER_TYPE = 0;

describe('NexusMutualPolka', function () {
  before(async function () {
    this.NexusMutualPolka = await ethers.getContractFactory('NexusMutualPolka');
    this.ExchangeAgent = await ethers.getContractFactory('ExchangeAgent');
    this.MockERC20 = await ethers.getContractFactory('MockERC20');
    this.signers = await ethers.getSigners();

    this.cvr = await (await this.MockERC20.deploy('CVR', 'CVR')).deployed();
    this.mockUSDC = await (await this.MockERC20.deploy('USDC', 'USDC')).deployed();
    this.exchangeAgent = await this.ExchangeAgent.deploy(this.mockUSDC.address, WETH, UNISWAPV2_FACTORY);

    this.cvrETHPair = await createPairETH(
      UNISWAPV2_ROUTER,
      UNISWAPV2_FACTORY,
      this.cvr.address,
      getBigNumber(500),
      getBigNumber(1),
      this.signers[0].address,
      this.signers[0]
    );

    this.apiHeader = { Origin: 'http://localhost:3000' };
    const coverData = {
      coverAmount: '1', // ETH in units not wei
      currency: 'ETH',
      asset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // stands for ETH
      period: '111', // days
      contractAddress: '0x0000000000000000000000000000000000000005', // the contract you will be buying cover for
    };

    this.coverData = coverData;
    /** This api endpoint is for Kovan testnet */
    this.quoteURL =
      'https://api.staging.nexusmutual.io/v1/quote?' +
      `coverAmount=${coverData.coverAmount}&currency=${coverData.currency}&period=${coverData.period}&contractAddress=${coverData.contractAddress}`;

    await ethers.provider.send('eth_sendTransaction', [
      { from: this.signers[10].address, to: this.exchangeAgent.address, value: getBigNumber(10).toHexString() },
    ]);
    await this.exchangeAgent.addCurrency(this.cvr.address);
  });

  beforeEach(async function () {
    this.nexusMutualPolka = await (
      await this.NexusMutualPolka.deploy(
        this.cvr.address,
        this.exchangeAgent.address, // @todo should be changed ExcahngeAgent
        DISTRIBUTOR_ADDRESS
      )
    ).deployed();

    await this.exchangeAgent.addWhiteList(this.nexusMutualPolka.address);
  });

  it('Should get data from Nexus API', async function () {
    const quote = await fetch(this.quoteURL, { headers: this.headers }).then((r) => r.json());
  });

  it('Should buy product By ETH', async function () {
    const quote = await fetch(this.quoteURL, { headers: this.headers }).then((r) => r.json());
    // {
    //   currency: 'ETH',
    //   period: '111',
    //   amount: '1',
    //   price: '66026290216319654',
    //   priceInNXM: '1726147109619947834',
    //   expiresAt: 1641910780,
    //   generatedAt: 1636726779229,
    //   contract: '0x0000000000000000000000000000000000000005',
    //   v: 27,
    //   r: '0xd8876b4e4edcf6a8504f94d4ddd373343954a3727713ee09d04e7fea3ffad1b2',
    //   s: '0x4048ec8fde7226cdd60c1911c0e1bd0eb8013a50f67b517201c29e2150aa4c7b'
    // }
    const contractAddress = this.coverData.contractAddress;
    const coverAsset = this.coverData.asset;
    const sumAssured = getBigNumber(this.coverData.coverAmount);
    const coverPeriod = this.coverData.period;
    const coverType = COVER_TYPE;
    const data = ethers.utils.defaultAbiCoder.encode(
      ['uint', 'uint', 'uint', 'uint', 'uint8', 'bytes32', 'bytes32'],
      [quote.price, quote.priceInNXM, quote.expiresAt, quote.generatedAt, quote.v, quote.r, quote.s]
    );

    const expectedPrice = await this.nexusMutualPolka.getProductPrice(contractAddress, coverAsset, sumAssured, coverPeriod, coverType, data);
    console.log(`expectedPrice ${expectedPrice.toString()}`);

    await this.nexusMutualPolka.buyCoverByETH(contractAddress, coverAsset, sumAssured, coverPeriod, coverType, expectedPrice, data, {
      value: expectedPrice,
    });
  });

  it('Should buy product by token', async function () {
    const quote = await fetch(this.quoteURL, { headers: this.headers }).then((r) => r.json());

    const contractAddress = this.coverData.contractAddress;
    const coverAsset = this.coverData.asset;
    const sumAssured = getBigNumber(this.coverData.coverAmount);
    const coverPeriod = this.coverData.period;
    const coverType = COVER_TYPE;
    const data = ethers.utils.defaultAbiCoder.encode(
      ['uint', 'uint', 'uint', 'uint', 'uint8', 'bytes32', 'bytes32'],
      [quote.price, quote.priceInNXM, quote.expiresAt, quote.generatedAt, quote.v, quote.r, quote.s]
    );

    const expectedPrice = await this.nexusMutualPolka.getProductPrice(contractAddress, coverAsset, sumAssured, coverPeriod, coverType, data);
    console.log(`expectedPrice ${expectedPrice.toString()}`);

    await this.cvr.approve(this.nexusMutualPolka.address, getBigNumber(10000000000));
    await this.nexusMutualPolka.buyCoverByToken(
      [this.cvr.address, contractAddress, coverAsset],
      sumAssured,
      coverPeriod,
      coverType,
      expectedPrice,
      data
    );
  });
});
