import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ConfidentialUSDT, ConfidentialUSDT__factory, DarkSwap, DarkSwap__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const cusdtFactory = (await ethers.getContractFactory("ConfidentialUSDT")) as ConfidentialUSDT__factory;
  const cusdt = (await cusdtFactory.deploy()) as ConfidentialUSDT;
  const cusdtAddress = await cusdt.getAddress();

  const swapFactory = (await ethers.getContractFactory("DarkSwap")) as DarkSwap__factory;
  const swap = (await swapFactory.deploy(cusdtAddress)) as DarkSwap;

  return { cusdt, cusdtAddress, swap };
}

describe("DarkSwap", function () {
  let signers: Signers;
  let cusdt: ConfidentialUSDT;
  let cusdtAddress: string;
  let swap: DarkSwap;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ cusdt, cusdtAddress, swap } = await deployFixture());
  });

  it("quotes 1 ETH to 2300 cUSDT (6 decimals)", async function () {
    const ethAmount = ethers.parseEther("1");
    const expected = 2300n * 1_000_000n;

    const quoted = await swap.quoteCusdt(ethAmount);
    expect(quoted).to.eq(expected);
  });

  it("mints cUSDT to the sender on swapEthForMyCusdt", async function () {
    const ethAmount = ethers.parseEther("1");
    await swap.connect(signers.alice).swapEthForMyCusdt({ value: ethAmount });

    const encryptedBalance = await cusdt.confidentialBalanceOf(signers.alice.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cusdtAddress,
      signers.alice,
    );

    expect(clearBalance).to.eq(2300n * 1_000_000n);
  });

  it("mints cUSDT to a recipient on swapEthForCusdt", async function () {
    const ethAmount = ethers.parseEther("0.25");
    await swap.connect(signers.alice).swapEthForCusdt(signers.bob.address, { value: ethAmount });

    const encryptedBalance = await cusdt.confidentialBalanceOf(signers.bob.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cusdtAddress,
      signers.bob,
    );

    expect(clearBalance).to.eq(575n * 1_000_000n);
  });

  it("reverts when ETH amount is zero", async function () {
    await expect(swap.connect(signers.alice).swapEthForMyCusdt({ value: 0 }))
      .to.be.revertedWithCustomError(swap, "InsufficientEth");
  });
});
