import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const proxyAddress = "0xf3D3DEF6C0aba842fbd1930a120419fcdb96ae52";

  // 1. Деплоим новую реализацию V2
  const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
  const implV2 = await MyTokenV2.deploy();
  await implV2.waitForDeployment();
  console.log("MyTokenV2 implementation deployed at:", await implV2.getAddress());

  // 2. Подключаемся к прокси с ABI V2
  //    Через этот объект будем:
  //    - читать баланс
  //    - делать апгрейд
  //    - вызывать version()
  const tokenViaProxy = MyTokenV2.attach(proxyAddress);

  // 3. Читаем баланс до апгрейда (для проверки, что storage не сломаем)
  const balanceBefore = await tokenViaProxy.balanceOf(deployer.address);
  console.log("Balance BEFORE upgrade:", balanceBefore.toString());

  // 4. Делаем апгрейд через upgradeToAndCall
  //    Второй параметр — bytes data для "init вызова".
  //    Нам ничего вызывать не нужно → передаём "0x".
  console.log("Upgrading proxy to V2 via upgradeToAndCall...");
  const tx = await tokenViaProxy.upgradeToAndCall(await implV2.getAddress(), "0x");
  await tx.wait();
  console.log("✅ Upgrade complete!");

  // 5. Проверяем баланс после апгрейда
  const balanceAfter = await tokenViaProxy.balanceOf(deployer.address);
  console.log("Balance AFTER upgrade:", balanceAfter.toString());

  if (balanceBefore === balanceAfter) {
    console.log("✅ Balances match – storage layout is consistent.");
  } else {
    console.log("❌ Balances differ – проблема с layout!");
  }

  // 6. Проверяем новую функцию version() через ПРОКСИ
  const v = await tokenViaProxy.version();
  console.log("version() via proxy:", v); // должно быть "V2"
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
