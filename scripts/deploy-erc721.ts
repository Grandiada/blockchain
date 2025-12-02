import { network } from "hardhat";
import { formatEther } from "ethers";

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SoulboundVisitCardERC721 with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEth = formatEther(balance);
  console.log("Account balance:", balanceEth, "ETH");
  
  // Estimate gas cost
  const SoulboundVisitCardERC721 = await ethers.getContractFactory("SoulboundVisitCardERC721");
  
  let estimatedCost = 0n;
  try {
    const deployTx = await SoulboundVisitCardERC721.getDeployTransaction(deployer.address);
    const gasEstimate = await ethers.provider.estimateGas(deployTx);
    const gasPrice = await ethers.provider.getFeeData();
    const price = gasPrice.gasPrice || gasPrice.maxFeePerGas || 0n;
    estimatedCost = gasEstimate * (typeof price === 'bigint' ? price : BigInt(price));
    const estimatedCostEth = formatEther(estimatedCost);
    console.log("Estimated deployment cost:", estimatedCostEth, "ETH");
    
    if (balance < estimatedCost) {
      console.error("\n❌ ERROR: Insufficient funds!");
      console.error(`  Balance: ${balanceEth} ETH`);
      console.error(`  Required: ${estimatedCostEth} ETH`);
      console.error(`  Missing: ${formatEther(estimatedCost - balance)} ETH`);
      console.error("\nPlease fund your account and try again.");
      process.exitCode = 1;
      return;
    }
    
    console.log("✓ Sufficient funds available, deploying...\n");
  } catch (error) {
    console.warn("⚠️  Could not estimate gas, proceeding with deployment...");
    console.warn("  If deployment fails due to insufficient funds, please fund your account.\n");
  }
  
  // Deploy the contract with deployer as the initial owner
  const soulboundVisitCard = await SoulboundVisitCardERC721.deploy(deployer.address);
  await soulboundVisitCard.waitForDeployment();
  
  const address = await soulboundVisitCard.getAddress();
  console.log("SoulboundVisitCardERC721 deployed to:", address);
  
  // Verify the owner
  const owner = await soulboundVisitCard.owner();
  console.log("Contract owner:", owner);
  console.log("Owner matches deployer:", owner.toLowerCase() === deployer.address.toLowerCase());
  
  // Verify contract name and symbol
  const name = await soulboundVisitCard.name();
  const symbol = await soulboundVisitCard.symbol();
  console.log("Contract name:", name);
  console.log("Contract symbol:", symbol);
  
  const ipfsURI = "ipfs://bafkreid3hhj7xomsrxdcnexcqjlbkncig3dr2cd3t3isw2xooi2tomctqa";
  
  console.log("\nMinting visit card...");
  console.log("IPFS URI:", ipfsURI);
  
  const tx = await soulboundVisitCard.mintVisitCard(deployer.address, ipfsURI, "Informatics 22LRJS", 2025);
  await tx.wait();
  console.log("✓ Visit card minted successfully!");
  
  // Verify the token was minted
  const tokenId = await soulboundVisitCard.studentTokenId(deployer.address);
  const tokenURI = await soulboundVisitCard.tokenURI(tokenId);
  const [course, year] = await soulboundVisitCard.getStudentMetadata(tokenId);
  
  console.log("\nToken Details:");
  console.log("  Token ID:", tokenId.toString());
  console.log("  Token URI:", tokenURI);
  console.log("  Course:", course);
  console.log("  Year:", year.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

