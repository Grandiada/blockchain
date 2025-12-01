import { network } from "hardhat";
import { parseEther } from "ethers";

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Деплоим реализацию V1
  const MyTokenV1 = await ethers.getContractFactory("MyTokenV1");
  const implV1 = await MyTokenV1.deploy();
  await implV1.waitForDeployment();
  console.log("MyTokenV1 implementation:", await implV1.getAddress());

  // 2. Подготавливаем initData для initialize(initialSupply, initialOwner)
  const initialSupply = parseEther("1000000"); // 1 000 000 MTK
  const initData = implV1.interface.encodeFunctionData("initialize", [
    initialSupply,
    deployer.address,
  ]);

  // 3. Деплоим прокси
  const MyTokenProxy = await ethers.getContractFactory("MyTokenProxy");
  const proxy = await MyTokenProxy.deploy(await implV1.getAddress(), initData);
  await proxy.waitForDeployment();
  console.log("Proxy address:", await proxy.getAddress());

  // 4. Подключаемся к прокси как к токену
  const token = await ethers.getContractAt("MyTokenV1", await proxy.getAddress());
  console.log("Token name via proxy:", await token.name());
  console.log(
    "Deployer balance:",
    (await token.balanceOf(deployer.address)).toString()
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
