// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoulboundVisitCardERC721
 * @dev ERC-721 Soulbound NFT representing a student visit card.
 *
 * Features:
 * - One unique token per student (per wallet).
 * - Only contract owner can mint.
 * - Soulbound: no transfers, no approvals after minting.
 * - Metadata stored off-chain via tokenURI (e.g. IPFS).
 */
contract SoulboundVisitCardERC721 is ERC721URIStorage, Ownable {
    // ============ State ============

    uint256 private _nextTokenId = 1; // start IDs from 1 for convenience

    // Make sure each student (wallet) can receive only one card
    mapping(address => uint256) private _studentTokenId;


    // ============ Events ============

    event VisitCardMinted(
        address indexed student,
        uint256 indexed tokenId,
        string tokenURI_
    );

    // ============ Constructor ============

    constructor(address initialOwner)
        ERC721("Student Visit Card", "SVC")
        Ownable(initialOwner)
    {}

    // ============ Public View Helpers ============

    /**
     * @dev Returns the tokenId of the student's card or 0 if none.
     */
    function studentTokenId(address student) external view returns (uint256) {
        return _studentTokenId[student];
    }

    /**
     * @dev Returns true if the student already has a visit card.
     */
    function hasCard(address student) external view returns (bool) {
        return _studentTokenId[student] != 0;
    }


    // ============ Mint Logic (Owner Only) ============

    /**
     * @dev Mint a new soulbound visit card to `student`.
     *
     * Requirements:
     * - caller must be contract owner.
     * - `student` must not be the zero address.
     * - `student` must not already own a card.
     * - `tokenURI_` should point to off-chain metadata (e.g. IPFS JSON),
     *   which includes:
     *      - a unique image (image field)
     *      - additional attributes: e.g. studentName, studentID.
     */
    function mintVisitCard(
        address student,
        string calldata tokenURI_
    ) external onlyOwner {
        require(student != address(0), "Invalid student address");
        require(_studentTokenId[student] == 0, "Student already has a card");

        uint256 tokenId = _nextTokenId++;
        _safeMint(student, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _studentTokenId[student] = tokenId;

        emit VisitCardMinted(student, tokenId, tokenURI_);
    }

    // ============ Soulbound Enforcement ============

    /**
     * @dev Disable single-token approval completely.
     */
    function approve(address, uint256) public virtual override(ERC721, IERC721) {
        revert("Soulbound: approvals disabled");
    }

    /**
     * @dev Disable operator approvals completely.
     */
    function setApprovalForAll(address, bool) public virtual override(ERC721, IERC721) {
        revert("Soulbound: approvals disabled");
    }

    /**
     * @dev Disable unsafe transfers.
     */
    function transferFrom(address, address, uint256) public virtual override(ERC721, IERC721) {
        revert("Soulbound: transfer disabled");
    }

    /**
     * @dev Disable safe transfers (with data).
     * Note: The no-data version (safeTransferFrom without bytes) calls this one internally,
     * so overriding this will block both versions.
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public virtual override(ERC721, IERC721) {
        revert("Soulbound: transfer disabled");
    }

    /**
     * @dev Extra safety: block any transfer at hook level except minting (from 0).
     * In OpenZeppelin v5, _beforeTokenTransfer was replaced with _update.
     * We also block burning (to 0), so tokens are truly non-transferable & non-burnable.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow only minting during transfers (from == 0, to != 0).
        // Block transfers between non-zero addresses and burning (to == 0).
        if (from != address(0)) {
            revert("Soulbound: non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }

    // ============ Internal Overrides ============

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
