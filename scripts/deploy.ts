import { network } from "hardhat";
import { parseEther } from "ethers";

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);
  const MyToken = await ethers.getContractFactory("MyToken");
  const myToken = await MyToken.deploy(parseEther("1000000"));
  await myToken.waitForDeployment();
  console.log("MyToken deployed to:", await myToken.getAddress());
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

