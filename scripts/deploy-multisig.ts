import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MultiSigWallet with account:", deployer.address);
  
  // Owners are hardcoded in the contract
  const owners = [
    "0x7ba08dbfe0723eb58ea7d255fcb3ad9125f9edc3",
    "0xf99652997c430cd70a4ea249fb4d7ccb8fac4875"
  ];
  
  console.log("Hardcoded owners:", owners);
  console.log("Required confirmations: 2 (both owners must confirm)");
  
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.deploy();
  await multiSigWallet.waitForDeployment();
  
  const address = await multiSigWallet.getAddress();
  console.log("MultiSigWallet deployed to:", address);
  
  // Verify owners
  console.log("\nVerifying owners:");
  for (let i = 0; i < owners.length; i++) {
    const isOwner = await multiSigWallet.isOwner(owners[i]);
    console.log(`  Owner ${i + 1} (${owners[i]}): ${isOwner ? "✓" : "✗"}`);
  }
  
  // Verify required confirmations
  const requiredConfirmations = await multiSigWallet.requiredConfirmations();
  console.log(`\nRequired confirmations: ${requiredConfirmations}`);
  
  console.log("\nDeployment completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

