import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network localhost task:darkswap-address
 *   - npx hardhat --network sepolia task:darkswap-address
 */
task("task:darkswap-address", "Prints the DarkSwap address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const swap = await deployments.get("DarkSwap");
  console.log("DarkSwap address is " + swap.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:cusdt-address
 *   - npx hardhat --network sepolia task:cusdt-address
 */
task("task:cusdt-address", "Prints the ConfidentialUSDT address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const cusdt = await deployments.get("ConfidentialUSDT");
  console.log("ConfidentialUSDT address is " + cusdt.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:swap-quote --eth 0.1
 *   - npx hardhat --network sepolia task:swap-quote --eth 0.1
 */
task("task:swap-quote", "Quotes cUSDT output for a given ETH amount")
  .addParam("eth", "ETH amount to quote")
  .addOptionalParam("address", "Optionally specify the DarkSwap contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const swapDeployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("DarkSwap");
    const swapContract = await ethers.getContractAt("DarkSwap", swapDeployment.address);

    const ethAmount = ethers.parseEther(taskArguments.eth);
    const cusdtAmount = await swapContract.quoteCusdt(ethAmount);

    console.log(`DarkSwap: ${swapDeployment.address}`);
    console.log(`ETH in : ${taskArguments.eth}`);
    console.log(`cUSDT  : ${cusdtAmount.toString()}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:swap --eth 0.1
 *   - npx hardhat --network sepolia task:swap --eth 0.1 --recipient 0x...
 */
task("task:swap", "Swaps ETH for cUSDT")
  .addParam("eth", "ETH amount to swap")
  .addOptionalParam("recipient", "Recipient address for cUSDT (defaults to signer)")
  .addOptionalParam("address", "Optionally specify the DarkSwap contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const swapDeployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("DarkSwap");
    const swapContract = await ethers.getContractAt("DarkSwap", swapDeployment.address);

    const [signer] = await ethers.getSigners();
    const recipient = taskArguments.recipient ?? signer.address;
    const ethAmount = ethers.parseEther(taskArguments.eth);

    const tx = await swapContract.swapEthForCusdt(recipient, { value: ethAmount });
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });
