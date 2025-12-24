import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const cusdt = await deploy("ConfidentialUSDT", {
    from: deployer,
    log: true,
  });

  const swap = await deploy("DarkSwap", {
    from: deployer,
    args: [cusdt.address],
    log: true,
  });

  console.log(`ConfidentialUSDT contract: `, cusdt.address);
  console.log(`DarkSwap contract: `, swap.address);
};

export default func;
func.id = "deploy_dark_swap";
func.tags = ["DarkSwap", "ConfidentialUSDT"];
