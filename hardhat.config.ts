import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],

  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },

  networks: {
    amoy: {
      type: "http",
      chainType: "op",
      chainId: 80002,
      url: configVariable("AMOY_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY1"), configVariable("PRIVATE_KEY2")],
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
  },
};

export default config;
