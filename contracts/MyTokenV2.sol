// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MyTokenV1.sol";

contract MyTokenV2 is MyTokenV1 {
    function version() public pure returns (string memory) {
        return "V2";
    }
}
