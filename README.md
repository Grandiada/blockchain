# Blockchain NFT Collection Project

This project implements two NFT standards:
- **ERC-721**: Soulbound Visit Card NFT (non-transferable, one per wallet)
- **ERC-1155**: Game Character Collection NFT (multi-token, transferable)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [ERC-721: Soulbound Visit Card](#erc-721-soulbound-visit-card)
  - [Contract Overview](#contract-overview)
  - [Deployment](#deployment)
  - [Minting](#minting)
- [ERC-1155: Game Character Collection](#erc-1155-game-character-collection)
  - [Contract Overview](#contract-overview-1)
  - [Deployment](#deployment-1)
  - [Minting](#minting-1)
- [Metadata Structure](#metadata-structure)
  - [ERC-721 Metadata](#erc-721-metadata)
  - [ERC-1155 Metadata](#erc-1155-metadata)
  - [Storage Location](#storage-location)
- [Network Configuration](#network-configuration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A wallet with testnet funds (for Polygon Amoy or other testnets)
- Access to an IPFS service (for metadata storage)

## Environment Setup

1. **Install Dependencies**

```bash
npm install
```

2. **Create `.env` File**

Create a `.env` file in the project root with the following variables:

```env
# Network Configuration
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY1=your_private_key_here
PRIVATE_KEY2=your_second_private_key_here

# Optional: Network name for logging
NETWORK_NAME=amoy
```

3. **Compile Contracts**

```bash
npm run build-hardhat
# or
npx hardhat compile
```

## ERC-721: Soulbound Visit Card

### Contract Overview

The `SoulboundVisitCardERC721` contract implements a **soulbound** (non-transferable) ERC-721 NFT. Key features:

- **One token per wallet**: Each address can only receive one visit card
- **Owner-only minting**: Only the contract owner can mint new cards
- **Soulbound**: Tokens cannot be transferred or approved after minting
- **Metadata stored off-chain**: Uses IPFS for metadata storage

**Contract Location**: `contracts/SoulboundVisitCardERC721.sol`

### Deployment

Deploy the ERC-721 contract to Polygon Amoy:

```bash
npm run deploy-erc-721
# or
npx hardhat run scripts/deploy-erc721.ts --network amoy
```

**What the deployment script does:**
1. Deploys the contract with the deployer as the initial owner
2. Verifies contract deployment and ownership
3. Mints a visit card to the deployer address
4. Displays the deployed contract address and token details

**Expected Output:**
```
Deploying SoulboundVisitCardERC721 with account: 0x...
Account balance: X ETH
SoulboundVisitCardERC721 deployed to: 0x...
Contract owner: 0x...
✓ Visit card minted successfully!
Token ID: 1
Token URI: ipfs://...
```

### Minting

#### Method 1: Using the Deployment Script

The deployment script automatically mints one card to the deployer. To mint to a different address, modify `scripts/deploy-erc721.ts`:

```typescript
const tx = await soulboundVisitCard.mintVisitCard(
  "0xRecipientAddress", // Change this address
  "ipfs://YourMetadataCID"
);
```

#### Method 2: Using Hardhat Console

1. Connect to the deployed contract:

```bash
npx hardhat console --network amoy
```

2. In the console:

```javascript
const [owner, recipient] = await ethers.getSigners();
const contractAddress = "0xYourDeployedContractAddress";
const SoulboundVisitCard = await ethers.getContractFactory("SoulboundVisitCardERC721");
const contract = SoulboundVisitCard.attach(contractAddress);

// Mint a visit card
const ipfsURI = "ipfs://bafkreid3hhj7xomsrxdcnexcqjlbkncig3dr2cd3t3isw2xooi2tomctqa";
const tx = await contract.mintVisitCard(recipient.address, ipfsURI);
await tx.wait();

// Check if minting was successful
const tokenId = await contract.studentTokenId(recipient.address);
console.log("Token ID:", tokenId.toString());
```

**Requirements for Minting:**
- Caller must be the contract owner
- Recipient address must not already have a visit card
- IPFS URI must point to valid ERC-721 metadata JSON


## ERC-1155: Game Character Collection

### Contract Overview

The `GameCharacterCollectionERC1155` contract implements a multi-token ERC-1155 standard for game characters. Key features:

- **10 distinct character types**: Token IDs 1-10, each representing a unique character
- **Batch operations**: Supports batch minting and batch transfers (gas efficient)
- **On-chain attributes**: Character stats (color, speed, strength, rarity) stored on-chain
- **Individual metadata URIs**: Each token can have its own IPFS metadata CID
- **Owner-only minting**: Only contract owner can mint new tokens
- **Transferable**: Unlike ERC-721, these tokens can be freely transferred

**Contract Location**: `contracts/GameCharacterCollectionERC1155.sol`

### Deployment

Deploy the ERC-1155 contract to Polygon Amoy:

```bash
npm run deploy-erc-1155
# or
npx hardhat run scripts/deployGameCharacters.ts --network amoy
```

**What the deployment script does:**
1. Deploys the contract with a placeholder base URI
2. Mints 10 NFTs (1 of each character type, IDs 1-10) to the deployer
3. Sets individual IPFS metadata URIs for all 10 tokens
4. Transfers 3 NFTs to the recipient wallet:
   - 1 NFT via single transfer (Token ID 1)
   - 2 NFTs via batch transfer (Token IDs 2, 3)
5. Displays final balances and metadata URIs

**Expected Output:**
```
Game Character Collection ERC-1155 Deployment Script
Deploying with account: 0x...
✓ Contract deployed to: 0x...
✓ Batch minting completed successfully!
✓ Batch URI setting completed successfully!
✓ Single transfer completed!
✓ Batch transfer completed!
✅ Deployment and Demo Completed Successfully!
```

### Minting

#### Method 1: Single Mint

Mint a single character NFT:

```javascript
const contract = await ethers.getContractAt(
  "GameCharacterCollectionERC1155",
  contractAddress
);

// Mint 1 token of ID 5 to an address
await contract.mint(
  "0xRecipientAddress",
  5,        // token ID (1-10)
  1,        // amount
  "0x"      // empty data
);
```

#### Method 2: Batch Mint (Recommended)

Mint multiple characters in one transaction (more gas efficient):

```javascript
const tokenIds = [1, 2, 3, 4, 5];
const amounts = [1, 1, 1, 1, 1]; // 1 of each

await contract.mintBatch(
  "0xRecipientAddress",
  tokenIds,
  amounts,
  "0x"
);
```

**Requirements for Minting:**
- Caller must be the contract owner
- Token ID must be between 1 and 10
- Amount must be greater than 0
- Character attributes must be initialized (done automatically in constructor)

### Character Attributes

Each character has on-chain attributes accessible via the contract:

```javascript
const attributes = await contract.characterAttributes(1);
console.log(attributes.color);     // "Red"
console.log(attributes.speed);     // 60
console.log(attributes.strength);  // 90
console.log(attributes.rarity);    // "Rare"
```

**Available Characters:**
- Token 1: Red Warrior (Rare, Speed: 60, Strength: 90)
- Token 2: Blue Mage (Common, Speed: 70, Strength: 50)
- Token 3: Green Ranger (Rare, Speed: 85, Strength: 65)
- Token 4: Purple Assassin (Epic, Speed: 95, Strength: 55)
- Token 5: Gold Paladin (Epic, Speed: 50, Strength: 95)
- Token 6: Silver Archer (Rare, Speed: 90, Strength: 60)
- Token 7: Black Knight (Common, Speed: 55, Strength: 85)
- Token 8: White Healer (Common, Speed: 65, Strength: 40)
- Token 9: Rainbow Champion (Legendary, Speed: 80, Strength: 80)
- Token 10: Crystal Guardian (Legendary, Speed: 75, Strength: 75)

### Setting Metadata URIs

After deployment, you can set or update individual token metadata URIs:

```javascript
// Set a single token URI
await contract.setTokenURI(
  1,  // token ID
  "ipfs://bafkreiaqdesixwjjbbvpfyykvhpgfnz3c565av5y4vugl6uuea5iuwvpru"
);

// Set multiple token URIs in one transaction
const tokenIds = [1, 2, 3];
const uris = [
  "ipfs://CID1",
  "ipfs://CID2",
  "ipfs://CID3"
];
await contract.setTokenURIBatch(tokenIds, uris);
```


## Metadata Structure

### ERC-721 Metadata

The ERC-721 metadata follows the [ERC-721 Metadata JSON Schema](https://eips.ethereum.org/EIPS/eip-721).

**Required Fields:**
- `name`: The name of the NFT
- `description`: A description of the NFT
- `image`: The URL to the image file (IPFS, HTTP, or HTTPS)

**Optional Fields:**
- `external_url`: URL to external site
- `attributes`: Array of trait objects

**Example (`src/metadata.json`):**

```json
{
  "name": "Student Visit Card",
  "description": "Soulbound NFT representing a unique student identity card.",
  "image": "ipfs://bafkreid3iaertrtuqoxy4orvck3dgxn73atgjljtdq6qgpx4ome7peiigm",
  "attributes": [
    {
      "trait_type": "course",
      "value": "Informatics 22LRJS"
    },
    {
      "trait_type": "year",
      "value": "2025"
    }
  ]
}
```

**Attribute Structure:**
```json
{
  "trait_type": "string",  // Name of the attribute
  "value": "string|number" // Value of the attribute
}
```

### ERC-1155 Metadata

The ERC-1155 metadata follows a similar structure to ERC-721 but is accessed via the `uri(uint256 id)` function.

**Example (`erc1151Metadata/metadata_1.json`):**

```json
{
  "name": "Red Warrior #1",
  "description": "A powerful Red Warrior character from the Game Character Collection...",
  "image": "ipfs://bafkreied4t4mcnkywvkkq4fpwa22anspslsem3racpghxuvxmcrpou623y",
  "attributes": [
    {
      "trait_type": "Color",
      "value": "Red"
    },
    {
      "trait_type": "Speed",
      "value": 60,
      "display_type": "number",
      "max_value": 100
    },
    {
      "trait_type": "Strength",
      "value": 90,
      "display_type": "number",
      "max_value": 100
    },
    {
      "trait_type": "Rarity",
      "value": "Rare"
    },
    {
      "trait_type": "Token ID",
      "value": 1,
      "display_type": "number"
    }
  ]
}
```

**Number Attributes:**
For numeric attributes, you can include:
- `display_type`: "number" (for numeric values)
- `max_value`: Maximum value for the attribute (useful for progress bars)

### Storage Location

#### Metadata Storage

Both contracts store metadata **off-chain** using IPFS (InterPlanetary File System):

1. **Upload Metadata JSON**: Upload your metadata JSON file to IPFS using:
   - [Pinata](https://pinata.cloud/)
   - [NFT.Storage](https://nft.storage/)
   - [Web3.Storage](https://web3.storage/)
   - Your own IPFS node

2. **Get IPFS CID**: After uploading, you'll receive a Content Identifier (CID), e.g., `bafkreiaqdesixwjjbbvpfyykvhpgfnz3c565av5y4vugl6uuea5iuwvpru`

3. **Format URI**: Use the IPFS protocol URL:
   ```
   ipfs://bafkreiaqdesixwjjbbvpfyykvhpgfnz3c565av5y4vugl6uuea5iuwvpru
   ```

4. **Set in Contract**: 
   - **ERC-721**: Pass the URI when minting: `mintVisitCard(address, ipfsURI)`
   - **ERC-1155**: Set via `setTokenURI(tokenId, ipfsURI)` or `setTokenURIBatch()`

#### On-Chain Storage (ERC-1155 Only)

The ERC-1155 contract stores character attributes **on-chain** in a mapping:

```solidity
mapping(uint256 => CharacterAttributes) public characterAttributes;

struct CharacterAttributes {
    string color;
    uint256 speed;
    uint256 strength;
    string rarity;
}
```

This allows querying character stats directly from the contract without fetching metadata.

## Network Configuration

### Supported Networks

The project is configured for:

1. **Polygon Amoy** (Testnet)
   - Chain ID: 80002
   - RPC URL: Set via `AMOY_RPC_URL` in `.env`
   - Use for testing deployments

2. **Hardhat Local** (Simulated OP Mainnet)
   - Chain Type: Optimism
   - Use for local development and testing

### Adding a New Network

Edit `hardhat.config.ts`:

```typescript
networks: {
  yourNetwork: {
    type: "http",
    chainType: "op", // or "evm"
    chainId: YOUR_CHAIN_ID,
    url: configVariable("YOUR_RPC_URL"),
    accounts: [configVariable("PRIVATE_KEY1")],
  },
}
```

## Troubleshooting

### Common Issues

1. **"Insufficient funds" Error**
   - Ensure your wallet has enough testnet tokens
   - For Polygon Amoy, get testnet MATIC from [faucet](https://faucet.polygon.technology/)

2. **"Student already has a card" (ERC-721)**
   - Each wallet can only have one visit card
   - Use a different address or check existing cards with `studentTokenId(address)`

3. **"Invalid token ID" (ERC-1155)**
   - Token IDs must be between 1 and 10
   - Check available IDs: `MAX_TOKEN_ID` constant in contract

4. **Metadata Not Loading**
   - Verify IPFS CID is correct and accessible
   - Check metadata JSON structure matches the standard
   - Ensure `image` field in metadata points to a valid IPFS image URL

5. **TypeScript Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version (requires v18+)

### Verifying Contracts

After deployment, verify your contract on block explorers:

1. **Polygon Amoy Explorer**: https://amoy.polygonscan.com/
2. Enter your contract address
3. View contract details, transactions, and events

