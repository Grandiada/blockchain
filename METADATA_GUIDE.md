# ERC-721 Metadata Guide

## Overview
The `tokenURI` in your ERC-721 contract must point to a JSON file that follows the [ERC-721 Metadata JSON Schema](https://eips.ethereum.org/EIPS/eip-721).

## Required Structure

The JSON file must include at minimum:
- `name`: The name of the NFT
- `description`: A description of the NFT
- `image`: The URL to the image file (this is what MetaMask displays!)

## Example Metadata JSON

```json
{
  "name": "Student Visit Card",
  "description": "Soulbound ERC-721 NFT representing a student visit card",
  "image": "ipfs://QmYourImageHashHere",
  "external_url": "",
  "attributes": [
    {
      "trait_type": "Course",
      "value": "Informatics 22LRJS"
    },
    {
      "trait_type": "Year",
      "value": 2025
    }
  ]
}
```

## Image Field Format

The `image` field can be:
1. **IPFS URL**: `ipfs://QmYourImageHashHere` (recommended)
2. **HTTP/HTTPS URL**: `https://example.com/image.png`
3. **IPFS Gateway URL**: `https://ipfs.io/ipfs/QmYourImageHashHere`

### Important Notes:
- **MetaMask pulls the image from the `image` field** in the metadata JSON
- The `image` field must be present and contain a valid URL
- If using IPFS, prefer `ipfs://` protocol URLs (MetaMask supports them)
- Gateway URLs (like Pinata) work but may change, so IPFS protocol URLs are more reliable

## Steps to Fix Empty Image

1. **Upload your image to IPFS** (using Pinata, NFT.Storage, or similar)
2. **Create a metadata JSON file** with the structure above
3. **Set the `image` field** to your image's IPFS hash: `ipfs://QmYourImageHashHere`
4. **Upload the metadata JSON to IPFS**
5. **Use the metadata JSON's IPFS URL** as the `tokenURI` when minting

## Verifying Your Metadata

Before minting, you can verify your metadata JSON:
1. Open the IPFS URL in a browser
2. Check that it returns valid JSON
3. Verify the `image` field exists and has a valid URL
4. Test the image URL directly to ensure it loads

## Common Issues

### Image is Empty
- ❌ Missing `image` field in JSON
- ❌ `image` field is empty string
- ❌ Image URL is broken or inaccessible
- ✅ **Solution**: Ensure `image` field exists and points to a valid, accessible image URL

### Image Not Loading
- Check if the image URL is accessible
- Try opening the image URL directly in a browser
- If using IPFS gateway, ensure the gateway is working
- Consider using `ipfs://` protocol URLs instead of gateway URLs

