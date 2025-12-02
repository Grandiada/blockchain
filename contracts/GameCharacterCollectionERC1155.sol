// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GameCharacterCollectionERC1155
 * @dev ERC-1155 Multi-Token Standard implementation for game character NFTs.
 *
 * Features:
 * - 10 distinct game character token IDs (1-10)
 * - Each character has unique attributes (color, speed, strength, rarity)
 * - Owner-only minting (single and batch)
 * - Standard ERC-1155 transfers and approvals enabled
 * - ERC-1155 compatible metadata URI pattern
 * - On-chain character attributes storage
 *
 * Token IDs:
 * - Token IDs 1-10 represent different game characters
 * - Each token ID can have multiple quantities (fungible within the same character type)
 * - Attributes are stored on-chain in a mapping for each token ID
 */
contract GameCharacterCollectionERC1155 is ERC1155, Ownable {
    // ============ State ============

    /**
     * @dev Character attributes structure
     * Stores on-chain attributes for each game character token ID
     */
    struct CharacterAttributes {
        string color;      // Character color theme (e.g., "Red", "Blue", "Green")
        uint256 speed;      // Speed stat (0-100)
        uint256 strength;   // Strength stat (0-100)
        string rarity;      // Rarity level (e.g., "Common", "Rare", "Epic", "Legendary")
    }

    /**
     * @dev Mapping from token ID to character attributes
     * Token IDs 1-10 are valid character IDs
     */
    mapping(uint256 => CharacterAttributes) public characterAttributes;

    /**
     * @dev Base URI for metadata
     * Supports ERC-1155 standard {id} placeholder pattern
     * Example: "ipfs://QmHash/" will resolve to "ipfs://QmHash/1.json" for token ID 1
     */
    string private _baseURI;

    /**
     * @dev Mapping from token ID to custom URI
     * If set, this takes precedence over baseURI pattern
     * Allows each token to have its own unique metadata URI (e.g., different IPFS CIDs)
     */
    mapping(uint256 => string) private _tokenURIs;

    /**
     * @dev Maximum token ID (10 characters)
     */
    uint256 public constant MAX_TOKEN_ID = 10;

    // ============ Events ============

    /**
     * @dev Emitted when character attributes are set for a token ID
     */
    event CharacterAttributesSet(
        uint256 indexed tokenId,
        string color,
        uint256 speed,
        uint256 strength,
        string rarity
    );

    /**
     * @dev Emitted when base URI is updated
     */
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Emitted when a token's custom URI is set
     */
    event TokenURIUpdated(uint256 indexed tokenId, string tokenURI);

    // ============ Constructor ============

    /**
     * @dev Initializes the contract with base URI and sets deployer as owner
     * @param baseURI_ Base URI for metadata (supports {id} placeholder)
     * @param initialOwner Address that will own the contract
     *
     * Example baseURI: "ipfs://QmYourHash/" or "https://api.example.com/metadata/"
     * The {id} placeholder will be replaced with the token ID when uri() is called
     */
    constructor(
        string memory baseURI_,
        address initialOwner
    ) ERC1155("") Ownable(initialOwner) {
        _baseURI = baseURI_;
        _initializeCharacters();
    }

    // ============ Public View Functions ============

    /**
     * @dev Returns the metadata URI for a given token ID
     * @param id Token ID (1-10)
     * @return URI string following ERC-1155 metadata standard
     *
     * ERC-1155 standard requires:
     * - Returns a JSON file URL
     * - JSON must contain: name, description, image, attributes
     * - Supports {id} placeholder replacement
     *
     * Priority:
     * 1. If a custom URI is set for this token ID, return it
     * 2. Otherwise, use baseURI pattern with {id} replacement
     *
     * If baseURI contains "{id}", it will be replaced with the token ID.
     * Otherwise, the token ID will be appended to the baseURI.
     * Example: baseURI "ipfs://QmHash/" + id 1 = "ipfs://QmHash/1.json"
     */
    function uri(uint256 id) public view override returns (string memory) {
        require(id >= 1 && id <= MAX_TOKEN_ID, "Invalid token ID");
        
        // Check if a custom URI is set for this token ID
        string memory customURI = _tokenURIs[id];
        if (bytes(customURI).length > 0) {
            return customURI;
        }
        
        // Fall back to baseURI pattern
        string memory idString = _toString(id);
        bytes memory baseURIBytes = bytes(_baseURI);
        bytes memory searchBytes = bytes("{id}");
        
        // Check if {id} placeholder exists in baseURI
        bool hasPlaceholder = false;
        uint256 placeholderIndex = 0;
        
        if (baseURIBytes.length >= 4) {
            for (uint256 i = 0; i <= baseURIBytes.length - 4; i++) {
                bool found = true;
                for (uint256 j = 0; j < 4; j++) {
                    if (baseURIBytes[i + j] != searchBytes[j]) {
                        found = false;
                        break;
                    }
                }
                if (found) {
                    hasPlaceholder = true;
                    placeholderIndex = i;
                    break;
                }
            }
        }
        
        if (hasPlaceholder) {
            // Replace {id} with actual token ID
            bytes memory beforePart = new bytes(placeholderIndex);
            bytes memory afterPart = new bytes(baseURIBytes.length - placeholderIndex - 4);
            
            for (uint256 i = 0; i < placeholderIndex; i++) {
                beforePart[i] = baseURIBytes[i];
            }
            for (uint256 i = 0; i < afterPart.length; i++) {
                afterPart[i] = baseURIBytes[placeholderIndex + 4 + i];
            }
            
            return string(abi.encodePacked(string(beforePart), idString, string(afterPart)));
        } else {
            // Append token ID if no placeholder found
            // Ensure baseURI ends with / if it doesn't already
            if (baseURIBytes.length > 0 && baseURIBytes[baseURIBytes.length - 1] != bytes1("/")) {
                return string(abi.encodePacked(_baseURI, "/", idString, ".json"));
            }
            return string(abi.encodePacked(_baseURI, idString, ".json"));
        }
    }

    /**
     * @dev Returns character attributes for a given token ID
     * @param tokenId Token ID (1-10)
     * @return CharacterAttributes struct with color, speed, strength, rarity
     */
    function getCharacterAttributes(
        uint256 tokenId
    ) external view returns (CharacterAttributes memory) {
        require(tokenId >= 1 && tokenId <= MAX_TOKEN_ID, "Invalid token ID");
        return characterAttributes[tokenId];
    }

    /**
     * @dev Returns the current base URI
     * @return Base URI string
     */
    function baseURI() external view returns (string memory) {
        return _baseURI;
    }

    // ============ Owner Functions ============

    /**
     * @dev Mint a single character NFT to an address
     * @param to Address to receive the NFT
     * @param id Token ID (1-10)
     * @param amount Quantity to mint
     * @param data Additional data to pass (can be empty bytes)
     *
     * Requirements:
     * - Caller must be contract owner
     * - Token ID must be between 1 and 10
     * - Amount must be greater than 0
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(id >= 1 && id <= MAX_TOKEN_ID, "Invalid token ID");
        require(amount > 0, "Amount must be greater than 0");
        require(
            bytes(characterAttributes[id].color).length > 0,
            "Character attributes not initialized"
        );

        _mint(to, id, amount, data);
    }

    /**
     * @dev Mint multiple character NFTs in a single transaction (batch minting)
     * @param to Address to receive the NFTs
     * @param ids Array of token IDs (each 1-10)
     * @param amounts Array of quantities for each token ID
     * @param data Additional data to pass (can be empty bytes)
     *
     * Requirements:
     * - Caller must be contract owner
     * - Arrays must have same length
     * - All token IDs must be between 1 and 10
     * - All amounts must be greater than 0
     * - All characters must have initialized attributes
     *
     * This is more gas-efficient than multiple single mints
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(ids.length == amounts.length, "Arrays length mismatch");
        require(ids.length > 0, "Empty arrays");

        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] >= 1 && ids[i] <= MAX_TOKEN_ID, "Invalid token ID");
            require(amounts[i] > 0, "Amount must be greater than 0");
            require(
                bytes(characterAttributes[ids[i]].color).length > 0,
                "Character attributes not initialized"
            );
        }

        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev Update the base URI for metadata
     * @param newBaseURI New base URI (supports {id} placeholder)
     *
     * Requirements:
     * - Caller must be contract owner
     *
     * This allows updating metadata location after deployment
     * Useful if metadata is moved to a different IPFS hash or server
     * Note: Custom token URIs take precedence over baseURI
     */
    function setURI(string memory newBaseURI) external onlyOwner {
        _baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Set a custom URI for a specific token ID
     * @param tokenId Token ID (1-10)
     * @param tokenURI_ Custom URI for this token (e.g., full IPFS URL)
     *
     * Requirements:
     * - Caller must be contract owner
     * - Token ID must be between 1 and 10
     *
     * This allows each token to have its own unique metadata URI
     * Useful when each token has a different IPFS CID
     */
    function setTokenURI(uint256 tokenId, string memory tokenURI_) external onlyOwner {
        require(tokenId >= 1 && tokenId <= MAX_TOKEN_ID, "Invalid token ID");
        _tokenURIs[tokenId] = tokenURI_;
        emit TokenURIUpdated(tokenId, tokenURI_);
    }

    /**
     * @dev Set custom URIs for multiple token IDs in a batch
     * @param tokenIds Array of token IDs (each 1-10)
     * @param tokenURIs Array of URIs corresponding to each token ID
     *
     * Requirements:
     * - Caller must be contract owner
     * - Arrays must have same length
     * - All token IDs must be between 1 and 10
     *
     * More gas-efficient than multiple setTokenURI calls
     */
    function setTokenURIBatch(
        uint256[] memory tokenIds,
        string[] memory tokenURIs
    ) external onlyOwner {
        require(tokenIds.length == tokenURIs.length, "Arrays length mismatch");
        require(tokenIds.length > 0, "Empty arrays");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                tokenIds[i] >= 1 && tokenIds[i] <= MAX_TOKEN_ID,
                "Invalid token ID"
            );
            _tokenURIs[tokenIds[i]] = tokenURIs[i];
            emit TokenURIUpdated(tokenIds[i], tokenURIs[i]);
        }
    }

    // ============ Internal Functions ============

    /**
     * @dev Initialize character attributes for token IDs 1-10
     * Called once in constructor to set up all 10 game characters
     *
     * Each character has:
     * - Unique color theme
     * - Speed stat (0-100)
     * - Strength stat (0-100)
     * - Rarity level
     */
    function _initializeCharacters() internal {
        // Character 1: Red Warrior
        characterAttributes[1] = CharacterAttributes({
            color: "Red",
            speed: 60,
            strength: 90,
            rarity: "Rare"
        });

        // Character 2: Blue Mage
        characterAttributes[2] = CharacterAttributes({
            color: "Blue",
            speed: 70,
            strength: 50,
            rarity: "Common"
        });

        // Character 3: Green Ranger
        characterAttributes[3] = CharacterAttributes({
            color: "Green",
            speed: 85,
            strength: 65,
            rarity: "Rare"
        });

        // Character 4: Purple Assassin
        characterAttributes[4] = CharacterAttributes({
            color: "Purple",
            speed: 95,
            strength: 55,
            rarity: "Epic"
        });

        // Character 5: Gold Paladin
        characterAttributes[5] = CharacterAttributes({
            color: "Gold",
            speed: 50,
            strength: 95,
            rarity: "Epic"
        });

        // Character 6: Silver Archer
        characterAttributes[6] = CharacterAttributes({
            color: "Silver",
            speed: 90,
            strength: 60,
            rarity: "Rare"
        });

        // Character 7: Black Knight
        characterAttributes[7] = CharacterAttributes({
            color: "Black",
            speed: 55,
            strength: 85,
            rarity: "Common"
        });

        // Character 8: White Healer
        characterAttributes[8] = CharacterAttributes({
            color: "White",
            speed: 65,
            strength: 40,
            rarity: "Common"
        });

        // Character 9: Rainbow Champion
        characterAttributes[9] = CharacterAttributes({
            color: "Rainbow",
            speed: 80,
            strength: 80,
            rarity: "Legendary"
        });

        // Character 10: Crystal Guardian
        characterAttributes[10] = CharacterAttributes({
            color: "Crystal",
            speed: 75,
            strength: 75,
            rarity: "Legendary"
        });

        // Emit events for all initialized characters
        for (uint256 i = 1; i <= MAX_TOKEN_ID; i++) {
            emit CharacterAttributesSet(
                i,
                characterAttributes[i].color,
                characterAttributes[i].speed,
                characterAttributes[i].strength,
                characterAttributes[i].rarity
            );
        }
    }

    /**
     * @dev Convert uint256 to string
     * @param value Number to convert
     * @return String representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

