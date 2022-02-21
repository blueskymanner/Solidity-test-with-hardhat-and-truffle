const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  getBigNumber,
  getHexStrFromStr,
  getPaddedHexStrFromBN,
} = require("../scripts/shared/utilities");
const {
  WETH_ADDRESS,
  UNISWAP_FACTORY_ADDRESS,
  CVR,
  USDC,
  CVR_USDC,
  WETH_USDC,
} = require("../scripts/shared/constants");

// We are doing test P4L on rinkeby
describe("P4LPolka", function () {
  before(async function () {
    this.P4LPolka = await ethers.getContractFactory("P4LPolka");
    this.ExchangeAgent = await ethers.getContractFactory("ExchangeAgent");
    this.MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    this.MockERC20 = await ethers.getContractFactory("MockERC20");
    this.signers = await ethers.getSigners();

    this.wethAddress = WETH_ADDRESS.rinkeby;
    this.uniswapFactoryAddress = UNISWAP_FACTORY_ADDRESS.rinkeby;

    this.cvrAddress = CVR.rinkeby;
    this.cvr = await this.MockERC20.attach(this.cvrAddress)

    this.usdcAddress = USDC.rinkeby;
    this.wethUsdcAddress = WETH_USDC.rinkeby;
    this.cvrUsdc = CVR_USDC.rinkeby;

    this.devWallet = this.signers[0];
  });

  beforeEach(async function () {
    this.exchangeAgent = await (await this.ExchangeAgent.deploy(
      this.usdcAddress,
      this.wethAddress,
      this.uniswapFactoryAddress
    )).deployed();

    this.multiSigWallet = await this.MultiSigWallet.deploy(
      [this.signers[0].address, this.signers[1].address, this.signers[2].address],
      2
    );

    this.p4lPolka = await (await this.P4LPolka.deploy(
      this.wethAddress,
      this.exchangeAgent.address,
      this.devWallet.address,
      this.multiSigWallet.address
    )).deployed();

    const addCurrencyCallData = this.exchangeAgent.interface.encodeFunctionData('addCurrency', [
      this.cvrAddress
    ]);

    await this.multiSigWallet.submitTransaction(this.p4lPolka.address, 0, addCurrencyCallData);
    await this.multiSigWallet.confirmTransaction(0, false);
    await this.multiSigWallet.connect(this.signers[1]).confirmTransaction(0, true);
  });

  it("Should buy P4L by ETH", async function () {
    let hexData = "";

    const device = "My Device";
    const brand = "My Brand";
    const value = 50;
    const purchMonth = 6;
    const durPlan = 6

    const hexDeviceStr = getHexStrFromStr(device);
    const hexBrandStr = getHexStrFromStr(brand);
    const paddedValueHexStr = getPaddedHexStrFromBN(value);
    const paddedPurchMonthHexStr = getPaddedHexStrFromBN(purchMonth);
    const paddedDurPlanHexStr = getPaddedHexStrFromBN(durPlan);

    hexData =
      hexDeviceStr +
      hexBrandStr.slice(2) +
      paddedValueHexStr.slice(2) +
      paddedPurchMonthHexStr.slice(2) +
      paddedDurPlanHexStr.slice(2);
    const flatSig = await this.devWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(hexData))
    );

    const expectedAmount = await this.exchangeAgent.getETHAmountForUSDC(
      value
    );

    await expect(
      this.p4lPolka.buyProductByETH(
        device,
        brand,
        value,
        purchMonth,
        durPlan,
        flatSig,
        { value: getBigNumber(1) }
      )
    )
      .to.emit(this.p4lPolka, "BuyP4L")
      .withArgs(
        0, this.signers[0].address, this.wethAddress, expectedAmount, value
      );
  });

  it("Should buy MSO by available token", async function () {
    let hexData = "";

    const device = "My Device";
    const brand = "My Brand";
    const value = 50;
    const purchMonth = 6;
    const durPlan = 6

    const hexDeviceStr = getHexStrFromStr(device);
    const hexBrandStr = getHexStrFromStr(brand);
    const paddedValueHexStr = getPaddedHexStrFromBN(value);
    const paddedPurchMonthHexStr = getPaddedHexStrFromBN(purchMonth);
    const paddedDurPlanHexStr = getPaddedHexStrFromBN(durPlan);

    hexData =
      hexDeviceStr +
      hexBrandStr.slice(2) +
      paddedValueHexStr.slice(2) +
      paddedPurchMonthHexStr.slice(2) +
      paddedDurPlanHexStr.slice(2);
    const flatSig = await this.devWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(hexData))
    );

    const expectedAmount = await this.exchangeAgent.getTokenAmountForUSDC(
      this.cvrAddress, value
    );

    await this.cvr.connect(this.signers[0]).approve(this.p4lPolka.address, getBigNumber(100000000000));

    const buyProductByTokenCallData = this.p4lPolka.interface.encodeFunctionData('buyProductByToken', [
      device,
        brand,
        value,
        purchMonth,
        durPlan,
        this.cvrAddress,
        this.signers[0].address,
        flatSig
    ]);

    // Transaction id is 1 -hardcoded here
    await this.multiSigWallet.submitTransaction(this.p4lPolka.address, 0, buyProductByTokenCallData);
    await this.multiSigWallet.confirmTransaction(1, false);
    await expect(this.multiSigWallet.connect(this.signers[1]).confirmTransaction(1, true))
      .to.emit(this.p4lPolka, 'BuyP4L')
      .withArgs(0, this.signers[0].address, this.cvrAddress, expectedAmount, value);

    await expect(
      this.p4lPolka.buyProductByToken(
        device,
        brand,
        value,
        purchMonth,
        durPlan,
        this.cvrAddress,
        this.signers[0].address,
        flatSig
      )
    )
      .to.emit(this.p4lPolka, "BuyP4L")
      .withArgs(
        1, this.signers[0].address, this.cvrAddress, expectedAmount, value
      );
  });
});
