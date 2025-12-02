import { network } from "hardhat";
import { formatEther } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const { ethers } = await network.connect();

/**
 * Deployment and Demo Script for GameCharacterCollectionERC1155
 *
 * This script:
 * 1. Deploys the GameCharacterCollectionERC1155 contract
 * 2. Mints 10 game character NFTs (1 per token ID, IDs 1-10)
 * 3. Transfers 1-2 NFTs to Wallet (demonstrates single and batch transfers)
 * 4. Logs all balances and operations
 *
 * Environment Variables Required:
 * - PRIVATE_KEY1: Deployer private key
 * - RECIPIENT_WALLET: Wallet address to receive NFTs
 * - AMOY_RPC_URL: RPC URL for Polygon Amoy (or other network)
 *
 * Usage:
 *   npx hardhat run scripts/deployGameCharacters.ts --network amoy
 *   npx hardhat run scripts/deployGameCharacters.ts --network hardhatOp
 */

async function main() {
  const [deployer, recipient] = await ethers.getSigners();
  console.log("=".repeat(60));
  console.log("Game Character Collection ERC-1155 Deployment Script");
  console.log("=".repeat(60));
  console.log("\nDeploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEth = formatEther(balance);
  console.log("Account balance:", balanceEth, "ETH");

  const recipientWallet = recipient.address;

  console.log("Wallet:", recipientWallet);

  // Get network info
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = networkInfo.chainId;
  const networkName = process.env.NETWORK_NAME || "unknown";
  console.log("Network:", networkName);
  console.log("Chain ID:", chainId.toString());
  console.log("\n" + "-".repeat(60));

  // ============ Step 1: Deploy Contract ============
  console.log("\n📦 Step 1: Deploying GameCharacterCollectionERC1155...");

  // Base URI for metadata (fallback if individual token URIs not set)
  // Individual token URIs will be set after deployment using setTokenURIBatch
  const baseURI = "ipfs://placeholder/";

  const GameCharacterCollection = await ethers.getContractFactory(
    "GameCharacterCollectionERC1155"
  );

  let estimatedCost = 0n;
  try {
    const deployTx = await GameCharacterCollection.getDeployTransaction(
      baseURI,
      deployer.address
    );
    const gasEstimate = await ethers.provider.estimateGas(deployTx);
    const gasPrice = await ethers.provider.getFeeData();
    const price = gasPrice.gasPrice || gasPrice.maxFeePerGas || 0n;
    estimatedCost =
      gasEstimate * (typeof price === "bigint" ? price : BigInt(price));
    const estimatedCostEth = formatEther(estimatedCost);
    console.log("Estimated deployment cost:", estimatedCostEth, "ETH");

    if (balance < estimatedCost) {
      console.error("\n❌ ERROR: Insufficient funds!");
      console.error(`  Balance: ${balanceEth} ETH`);
      console.error(`  Required: ${estimatedCostEth} ETH`);
      console.error(`  Missing: ${formatEther(estimatedCost - balance)} ETH`);
      process.exitCode = 1;
      return;
    }

    console.log("✓ Sufficient funds available");
  } catch (error) {
    console.warn("⚠️  Could not estimate gas, proceeding with deployment...");
  }

  // Deploy the contract
  const gameCharacterCollection = await GameCharacterCollection.deploy(
    baseURI,
    deployer.address
  );
  await gameCharacterCollection.waitForDeployment();

  const contractAddress = await gameCharacterCollection.getAddress();
  console.log("✓ Contract deployed to:", contractAddress);
  console.log("✓ Contract owner:", await gameCharacterCollection.owner());

  // ============ Step 2: Mint 10 NFTs ============
  console.log("\n" + "-".repeat(60));
  console.log("\n🎮 Step 2: Minting 10 Game Character NFTs...");
  console.log("   (1 NFT per token ID, IDs 1-10)");

  // Define token IDs and amounts
  // We'll mint 1 of each character (token IDs 1-10)
  const tokenIds: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const amounts: number[] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // 1 of each

  // Verify total is 10
  const totalMint = amounts.reduce((sum, amount) => sum + amount, 0);
  console.log(`   Total NFTs to mint: ${totalMint}`);

  // Demonstrate batch minting (more gas efficient)
  console.log("\n   📦 Batch Minting Demo: Using mintBatch()");
  console.log("   This is more gas-efficient than multiple single mints");

  try {
    const mintBatchTx = await gameCharacterCollection.mintBatch(
      deployer.address,
      tokenIds,
      amounts,
      "0x" // empty data
    );
    console.log("   Transaction hash:", mintBatchTx.hash);
    await mintBatchTx.wait();
    console.log("   ✓ Batch minting completed successfully!");

    // Log balances after minting
    console.log("\n   Balances after minting (Owner):");
    for (let i = 0; i < tokenIds.length; i++) {
      const balance = await gameCharacterCollection.balanceOf(
        deployer.address,
        tokenIds[i]
      );
      const attributes = await gameCharacterCollection.characterAttributes(
        tokenIds[i]
      );
      console.log(
        `   Token ID ${tokenIds[i]}: ${balance.toString()} (${attributes.color} ${attributes.rarity})`
      );
    }
  } catch (error: any) {
    console.error("   ❌ Error during batch minting:", error.message);
    throw error;
  }

  // ============ Step 3: Set Individual Token URIs ============
  console.log("\n" + "-".repeat(60));
  console.log("\n🔗 Step 3: Setting Individual Token Metadata URIs...");
  console.log("   Each token has its own IPFS CID for metadata");

  // IPFS CIDs for each token's metadata
  const tokenIPFSCIDs: { [key: number]: string } = {
    1: "bafkreiaqdesixwjjbbvpfyykvhpgfnz3c565av5y4vugl6uuea5iuwvpru",
    2: "bafkreieo74o7nwuculyboj266r77uo4yzrhgrxmgdcnsr6nbzmpxwfbv2e",
    3: "bafkreibmrm6t2udxl32aaevryk6yaei7vfkj7hmqpmfjvnxfawuxcx6e3a",
    4: "bafkreialnj34kj4pcmj3t7ewywtrantj25yhtxec623yz63vi6lw3rfn2e",
    5: "bafkreifwdji7iqdtldeodi5r7o55lhsiuct2trb2ovwfs2bygebvywyhp4",
    6: "bafkreidd36zykw57ag3gmiyeg4z2ndgsezvwqr4qf3vegn4ek3idofucfu",
    7: "bafkreiaaummrxr6phonigd77zxswnmpcdfr4jpbj6yiyusudnfkghcyh3u",
    8: "bafkreifwrrzwibrn7pt5fpnvbbgwt2guyow57iokga4bbk6m2py4txfg4m",
    9: "bafkreift3en3roqdzam4wghgb4fvmkruf4slhqlxixhdjgbjhbjg6osxui",
    10: "bafkreibp34iouf6sxopachowvao5ckneliyli4brhy5kn5vxscyjtfipra",
  };

  // Prepare arrays for batch URI setting
  const uriTokenIds: number[] = [];
  const uriStrings: string[] = [];

  for (let i = 1; i <= 10; i++) {
    uriTokenIds.push(i);
    uriStrings.push(`ipfs://${tokenIPFSCIDs[i]}`);
  }

  try {
    console.log("\n   📦 Batch URI Setting Demo: Using setTokenURIBatch()");
    console.log("   Setting URIs for all 10 tokens in a single transaction");

    const setURIBatchTx = await gameCharacterCollection.setTokenURIBatch(
      uriTokenIds,
      uriStrings
    );
    console.log("   Transaction hash:", setURIBatchTx.hash);
    await setURIBatchTx.wait();
    console.log("   ✓ Batch URI setting completed successfully!");

    // Verify URIs were set correctly
    console.log("\n   Verified Token URIs:");
    for (let i = 1; i <= 3; i++) {
      const tokenURI = await gameCharacterCollection.uri(i);
      console.log(`     Token ID ${i}: ${tokenURI}`);
    }
    console.log("     ... (showing first 3, all 10 are set)");
  } catch (error: any) {
    console.error("   ❌ Error during URI setting:", error.message);
    throw error;
  }

  // ============ Step 4: Transfer NFTs to Wallet ============
  console.log("\n" + "-".repeat(60));
  console.log("\n🎁 Step 4: Transferring NFTs to Wallet...");

  // Transfer 1 NFT using single transfer (safeTransferFrom)
  console.log("\n   📤 Single Transfer Demo: Using safeTransferFrom()");
  console.log("   Transferring Token ID 1 to Wallet...");

  try {
    const singleTransferTx = await gameCharacterCollection.safeTransferFrom(
      deployer.address,
      recipientWallet,
      1, // token ID
      1, // amount
      "0x" // empty data
    );
    console.log("   Transaction hash:", singleTransferTx.hash);
    await singleTransferTx.wait();
    console.log("   ✓ Single transfer completed!");

    // Check balances after single transfer
    const ownerBalance1 = await gameCharacterCollection.balanceOf(
      deployer.address,
      1
    );
    const studentBalance1 = await gameCharacterCollection.balanceOf(
      recipientWallet,
      1
    );
    console.log(`   Owner balance (Token ID 1): ${ownerBalance1.toString()}`);
    console.log(`   Student balance (Token ID 1): ${studentBalance1.toString()}`);
  } catch (error: any) {
    console.error("   ❌ Error during single transfer:", error.message);
    throw error;
  }

  // Transfer 1 more NFT using batch transfer (safeBatchTransferFrom)
  console.log("\n   📦 Batch Transfer Demo: Using safeBatchTransferFrom()");
  console.log("   Transferring Token IDs 2 and 3 to Wallet...");

  try {
    const batchTransferIds = [2, 3];
    const batchTransferAmounts = [1, 1];

    const batchTransferTx =
      await gameCharacterCollection.safeBatchTransferFrom(
        deployer.address,
        recipientWallet,
        batchTransferIds,
        batchTransferAmounts,
        "0x" // empty data
      );
    console.log("   Transaction hash:", batchTransferTx.hash);
    await batchTransferTx.wait();
    console.log("   ✓ Batch transfer completed!");

    // Check balances after batch transfer
    console.log("\n   Balances after batch transfer:");
    for (const id of batchTransferIds) {
      const ownerBalance = await gameCharacterCollection.balanceOf(
        deployer.address,
        id
      );
      const studentBalance = await gameCharacterCollection.balanceOf(
        recipientWallet,
        id
      );
      console.log(`   Token ID ${id}:`);
      console.log(`     Owner: ${ownerBalance.toString()}`);
      console.log(`     Student: ${studentBalance.toString()}`);
    }
  } catch (error: any) {
    console.error("   ❌ Error during batch transfer:", error.message);
    throw error;
  }

  // ============ Step 5: Final Balances Summary ============
  console.log("\n" + "-".repeat(60));
  console.log("\n📊 Step 5: Final Balances Summary");
  console.log("\n   All Token IDs (1-10):");

  console.log("\n   Owner Balances:");
  for (let i = 1; i <= 10; i++) {
    const balance = await gameCharacterCollection.balanceOf(
      deployer.address,
      i
    );
    const attributes = await gameCharacterCollection.characterAttributes(i);
    console.log(
      `     Token ID ${i}: ${balance.toString()} (${attributes.color} ${attributes.rarity}, Speed: ${attributes.speed}, Strength: ${attributes.strength})`
    );
  }

  console.log("\n   Student Balances:");
  for (let i = 1; i <= 10; i++) {
    const balance = await gameCharacterCollection.balanceOf(recipientWallet, i);
    if (balance > 0n) {
      const attributes = await gameCharacterCollection.characterAttributes(i);
      console.log(
        `     Token ID ${i}: ${balance.toString()} (${attributes.color} ${attributes.rarity}, Speed: ${attributes.speed}, Strength: ${attributes.strength})`
      );
    }
  }

  // ============ Step 6: Metadata URI Verification ============
  console.log("\n" + "-".repeat(60));
  console.log("\n🔗 Step 6: Metadata URI Verification");

  console.log("\n   Base URI:", await gameCharacterCollection.baseURI());
  console.log("\n   Example Token URIs:");
  for (let i = 1; i <= 3; i++) {
    const tokenURI = await gameCharacterCollection.uri(i);
    console.log(`     Token ID ${i}: ${tokenURI}`);
  }

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment and Demo Completed Successfully!");
  console.log("=".repeat(60));
  console.log("\nContract Address:", contractAddress);
  console.log("Network:", networkName);
  console.log("Chain ID:", chainId.toString());
  console.log("\nSummary:");
  console.log("  - 10 NFTs minted (1 per token ID)");
  console.log("  - Individual IPFS metadata URIs set for all 10 tokens");
  console.log("  - 1 NFT transferred via single transfer (Token ID 1)");
  console.log("  - 2 NFTs transferred via batch transfer (Token IDs 2, 3)");
  console.log("  - Total NFTs transferred to student: 3");
  console.log("\n" + "=".repeat(60));
}

main().catch((error) => {
  console.error("\n❌ Script failed with error:");
  console.error(error);
  process.exitCode = 1;
});

