const { BigNumber } = require('@ethersproject/bignumber');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { getBigNumber, getHexStrFromStr, getPaddedHexStrFromBN } = require('../scripts/shared/utilities');
const { WETH_ADDRESS, UNISWAP_FACTORY_ADDRESS, CVR, USDC, CVR_USDC, WETH_USDC } = require('../scripts/shared/constants');

// We are doing test MSO on rinkeby
describe('MSOPolka', function () {
  before(async function () {
    this.MSOPolka = await ethers.getContractFactory('MSOPolka');
    this.ExchangeAgent = await ethers.getContractFactory('ExchangeAgent');
    this.MultiSigWallet = await ethers.getContractFactory('MultiSigWallet');
    this.MockERC20 = await ethers.getContractFactory('MockERC20');
    this.signers = await ethers.getSigners();

    this.wethAddress = WETH_ADDRESS.rinkeby;
    this.uniswapFactoryAddress = UNISWAP_FACTORY_ADDRESS.rinkeby;

    this.cvrAddress = CVR.rinkeby;
    this.cvr = await this.MockERC20.attach(this.cvrAddress);

    this.usdcAddress = USDC.rinkeby;
    this.wethUsdcAddress = WETH_USDC.rinkeby;
    this.cvrUsdc = CVR_USDC.rinkeby;

    this.devWallet = this.signers[0];
  });

  beforeEach(async function () {
    this.exchangeAgent = await (await this.ExchangeAgent.deploy(this.usdcAddress, this.wethAddress, this.uniswapFactoryAddress)).deployed();

    this.multiSigWallet = await this.MultiSigWallet.deploy([this.signers[0].address, this.signers[1].address, this.signers[2].address], 2);

    this.msoPolka = await (
      await this.MSOPolka.deploy(this.wethAddress, this.exchangeAgent.address, this.devWallet.address, this.multiSigWallet.address)
    ).deployed();

    const addCurrencyCallData = this.exchangeAgent.interface.encodeFunctionData('addCurrency', [this.cvrAddress]);

    await this.multiSigWallet.submitTransaction(this.msoPolka.address, 0, addCurrencyCallData);
    await this.multiSigWallet.confirmTransaction(0, false);
    await this.multiSigWallet.connect(this.signers[1]).confirmTransaction(0, true);
  });

  it('Should buy MSO by ETH', async function () {
    let hexData = '';
    const productName = 'hello';
    const priceUSD = 30;
    const productPeriod = 5;
    const conciergePrice = 20;

    const hexStr = getHexStrFromStr(productName);

    const paddedPriceUSDHexStr = getPaddedHexStrFromBN(priceUSD);
    const paddedPeriodHexStr = getPaddedHexStrFromBN(productPeriod);
    const paddedConciergePriceHexStr = getPaddedHexStrFromBN(conciergePrice);

    hexData = hexStr + paddedPriceUSDHexStr.slice(2) + paddedPeriodHexStr.slice(2) + paddedConciergePriceHexStr.slice(2);
    const flatSig = await this.devWallet.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(hexData)));

    const expectedAmount = await this.exchangeAgent.getETHAmountForUSDC(priceUSD + conciergePrice);

    await expect(this.msoPolka.buyProductByETH(productName, priceUSD, productPeriod, conciergePrice, flatSig, { value: getBigNumber(5, 16) }))
      .to.emit(this.msoPolka, 'BuyMSO')
      .withArgs(0, this.signers[0].address, this.wethAddress, expectedAmount, priceUSD, conciergePrice);
  });

  it('Should buy MSO by available token', async function () {
    let hexData = '';
    const productName = 'hello';
    const priceUSD = 30;
    const productPeriod = 5;
    const conciergePrice = 20;

    const hexStr = getHexStrFromStr(productName);

    const paddedPriceUSDHexStr = getPaddedHexStrFromBN(priceUSD);
    const paddedPeriodHexStr = getPaddedHexStrFromBN(productPeriod);
    const paddedConciergePriceHexStr = getPaddedHexStrFromBN(conciergePrice);

    hexData = hexStr + paddedPriceUSDHexStr.slice(2) + paddedPeriodHexStr.slice(2) + paddedConciergePriceHexStr.slice(2);

    const flatSig = await this.devWallet.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(hexData)));

    const expectedAmount = await this.exchangeAgent.getTokenAmountForUSDC(this.cvrAddress, priceUSD + conciergePrice);

    await this.cvr.connect(this.signers[0]).approve(this.msoPolka.address, getBigNumber(100000000000));

    const buyProductByTokenCallData = this.msoPolka.interface.encodeFunctionData('buyProductByToken', [
      productName,
      priceUSD,
      productPeriod,
      this.cvrAddress,
      this.signers[0].address,
      conciergePrice,
      flatSig,
    ]);

    // Transaction id is 1 -hardcoded here
    await this.multiSigWallet.submitTransaction(this.msoPolka.address, 0, buyProductByTokenCallData);
    await this.multiSigWallet.confirmTransaction(1, false);
    await expect(this.multiSigWallet.connect(this.signers[1]).confirmTransaction(1, true))
      .to.emit(this.msoPolka, 'BuyMSO')
      .withArgs(0, this.signers[0].address, this.cvrAddress, expectedAmount, priceUSD, conciergePrice);

    // await expect(
    //   this.msoPolka.buyProductByToken(
    //     productName,
    //     priceUSD,
    //     productPeriod,
    //     this.cvrAddress,
    //     this.signers[0].address,
    //     conciergePrice,
    //     flatSig
    //   )
    // )
    //   .to.emit(this.msoPolka, "BuyMSO")
    //   .withArgs(
    //     1,
    //     this.signers[0].address,
    //     this.cvrAddress,
    //     expectedAmount,
    //     priceUSD,
    //     conciergePrice
    //   );
  });
});
