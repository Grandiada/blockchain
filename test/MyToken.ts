import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MyToken", function () {
  let deployer: any;
  let addr1: any;
  let addr2: any;
  let MyToken: any;
  let myToken: any;
  const initialSupply = ethers.parseEther("1000000");

  beforeEach(async function () {
    [deployer, addr1, addr2] = await ethers.getSigners();
    MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy(initialSupply);
    await myToken.waitForDeployment();
  });

  it("Should deploy with correct initial supply", async function () {
    expect(await myToken.balanceOf(deployer.address)).to.equal(initialSupply);
  });

  it("Owner can mint tokens", async function () {
    const mintAmount = ethers.parseEther("1000");
    await myToken.mint(addr1.address, mintAmount);
    expect(await myToken.balanceOf(addr1.address)).to.equal(mintAmount);
  });

  it("Non-owner cannot mint tokens", async function () {
    const mintAmount = ethers.parseEther("1000");
    await expect(
      myToken.connect(addr1).mint(addr1.address, mintAmount)
    ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
  });

  it("Should revert when minted not by owner - multiple non-owners", async function () {
    const mintAmount = ethers.parseEther("1000");
    // addr1 (non-owner) cannot mint
    await expect(
      myToken.connect(addr1).mint(addr2.address, mintAmount)
    ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
    
    // addr2 (non-owner) cannot mint
    await expect(
      myToken.connect(addr2).mint(addr1.address, mintAmount)
    ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
  });

  it("Should revert when non-owner attempts to mint - verify no state change", async function () {
    const mintAmount = ethers.parseEther("5000");
    const initialBalance = await myToken.balanceOf(addr1.address);
    const initialTotalSupply = await myToken.totalSupply();
    
    // Non-owner attempt should revert
    await expect(
      myToken.connect(addr1).mint(addr1.address, mintAmount)
    ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
    
    // Verify no state changes occurred
    expect(await myToken.balanceOf(addr1.address)).to.equal(initialBalance);
    expect(await myToken.totalSupply()).to.equal(initialTotalSupply);
  });

  it("Should revert when non-owner attempts to mint zero amount", async function () {
    const zeroAmount = 0n;
    await expect(
      myToken.connect(addr1).mint(addr1.address, zeroAmount)
    ).to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
  });

  it("Should successfully transfer tokens between accounts", async function () {
    const transferAmount = ethers.parseEther("50000");
    // Deployer transfers to addr1
    await expect(
      myToken.transfer(addr1.address, transferAmount)
    ).to.emit(myToken, "Transfer").withArgs(deployer.address, addr1.address, transferAmount);
  });

  it("Should allow transferFrom with approvals", async function () {
    const approveAmount = ethers.parseEther("1000");
    // Deployer approves addr1 to spend tokens
    await myToken.approve(addr1.address, approveAmount);
    // addr1 transfers from deployer to addr2
    await myToken.connect(addr1).transferFrom(deployer.address, addr2.address, approveAmount);
    expect(await myToken.balanceOf(addr2.address)).to.equal(approveAmount);
    expect(await myToken.allowance(deployer.address, addr1.address)).to.equal(0n);
  });

  it("Should revert when transferring more tokens than balance", async function () {
    const tooMuch = initialSupply + ethers.parseEther("1");
    await expect(
      myToken.transfer(addr1.address, tooMuch)
    ).to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance");
  });

  it("Should revert when transferFrom attempts to transfer more than allowance", async function () {
    const approveAmount = ethers.parseEther("10");
    await myToken.approve(addr1.address, approveAmount);
    await expect(
      myToken.connect(addr1).transferFrom(deployer.address, addr2.address, approveAmount + 1n)
    ).to.be.revertedWithCustomError(myToken, "ERC20InsufficientAllowance");
  });

  it("Should revert when transferFrom attempts to transfer more than from's balance", async function () {
    const mintAmount = ethers.parseEther("15");
    // Mint tokens to addr1
    await myToken.mint(addr1.address, mintAmount);
    // addr1 approves deployer for some more than its balance
    const approveAmount = mintAmount + ethers.parseEther("5");
    await myToken.connect(addr1).approve(deployer.address, approveAmount);
    // Deployer tries to transfer too much from addr1
    await expect(
      myToken.transferFrom(addr1.address, addr2.address, approveAmount)
    ).to.be.revertedWithCustomError(myToken, "ERC20InsufficientBalance");
  });

  // ========== Additional Minting Test Cases ==========
  
  it("Should increase total supply when minting tokens", async function () {
    const initialTotalSupply = await myToken.totalSupply();
    const mintAmount = ethers.parseEther("5000");
    await myToken.mint(addr1.address, mintAmount);
    const newTotalSupply = await myToken.totalSupply();
    expect(newTotalSupply).to.equal(initialTotalSupply + mintAmount);
  });

  it("Should allow owner to mint zero amount", async function () {
    const zeroAmount = 0n;
    await myToken.mint(addr1.address, zeroAmount);
    expect(await myToken.balanceOf(addr1.address)).to.equal(0n);
  });

  it("Should allow owner to mint to multiple addresses", async function () {
    const mintAmount1 = ethers.parseEther("1000");
    const mintAmount2 = ethers.parseEther("2000");
    await myToken.mint(addr1.address, mintAmount1);
    await myToken.mint(addr2.address, mintAmount2);
    expect(await myToken.balanceOf(addr1.address)).to.equal(mintAmount1);
    expect(await myToken.balanceOf(addr2.address)).to.equal(mintAmount2);
  });

  it("Should revert when minting to zero address", async function () {
    const zeroAddress = ethers.ZeroAddress;
    const mintAmount = ethers.parseEther("1000");
    await expect(
      myToken.mint(zeroAddress, mintAmount)
    ).to.be.revertedWithCustomError(myToken, "ERC20InvalidReceiver");
  });

  it("Should allow cumulative minting to same address", async function () {
    const mintAmount1 = ethers.parseEther("1000");
    const mintAmount2 = ethers.parseEther("2000");
    await myToken.mint(addr1.address, mintAmount1);
    await myToken.mint(addr1.address, mintAmount2);
    expect(await myToken.balanceOf(addr1.address)).to.equal(mintAmount1 + mintAmount2);
  });

  // ========== Additional Transfer Test Cases ==========

  it("Should update balances correctly after transfer", async function () {
    const transferAmount = ethers.parseEther("50000");
    const deployerInitialBalance = await myToken.balanceOf(deployer.address);
    const addr1InitialBalance = await myToken.balanceOf(addr1.address);
    
    await myToken.transfer(addr1.address, transferAmount);
    
    expect(await myToken.balanceOf(deployer.address)).to.equal(deployerInitialBalance - transferAmount);
    expect(await myToken.balanceOf(addr1.address)).to.equal(addr1InitialBalance + transferAmount);
  });

  it("Should allow transferring zero amount", async function () {
    const zeroAmount = 0n;
    await myToken.transfer(addr1.address, zeroAmount);
    expect(await myToken.balanceOf(addr1.address)).to.equal(0n);
  });

  it("Should allow self transfer", async function () {
    const transferAmount = ethers.parseEther("1000");
    const deployerInitialBalance = await myToken.balanceOf(deployer.address);
    await myToken.transfer(deployer.address, transferAmount);
    expect(await myToken.balanceOf(deployer.address)).to.equal(deployerInitialBalance);
  });

  it("Should revert when transferring to zero address", async function () {
    const transferAmount = ethers.parseEther("1000");
    const zeroAddress = ethers.ZeroAddress;
    await expect(
      myToken.transfer(zeroAddress, transferAmount)
    ).to.be.revertedWithCustomError(myToken, "ERC20InvalidReceiver");
  });

  it("Should allow transferring entire balance", async function () {
    const deployerBalance = await myToken.balanceOf(deployer.address);
    await myToken.transfer(addr1.address, deployerBalance);
    expect(await myToken.balanceOf(deployer.address)).to.equal(0n);
    expect(await myToken.balanceOf(addr1.address)).to.equal(deployerBalance);
  });

  it("Should allow multiple transfers between accounts", async function () {
    const transferAmount1 = ethers.parseEther("10000");
    const transferAmount2 = ethers.parseEther("20000");
    
    await myToken.transfer(addr1.address, transferAmount1);
    await myToken.transfer(addr2.address, transferAmount2);
    
    expect(await myToken.balanceOf(addr1.address)).to.equal(transferAmount1);
    expect(await myToken.balanceOf(addr2.address)).to.equal(transferAmount2);
  });

  it("Should emit Transfer event with correct parameters", async function () {
    const transferAmount = ethers.parseEther("50000");
    await expect(
      myToken.transfer(addr1.address, transferAmount)
    )
      .to.emit(myToken, "Transfer")
      .withArgs(deployer.address, addr1.address, transferAmount);
  });

  it("Should allow chain of transfers", async function () {
    const transferAmount = ethers.parseEther("10000");
    // Deployer -> addr1 -> addr2
    await myToken.transfer(addr1.address, transferAmount);
    await myToken.connect(addr1).transfer(addr2.address, transferAmount);
    expect(await myToken.balanceOf(addr1.address)).to.equal(0n);
    expect(await myToken.balanceOf(addr2.address)).to.equal(transferAmount);
  });

  // ========== Additional Balance Check Test Cases ==========

  it("Should return zero balance for address with no tokens", async function () {
    expect(await myToken.balanceOf(addr1.address)).to.equal(0n);
  });

  it("Should maintain balance consistency after multiple operations", async function () {
    const mintAmount = ethers.parseEther("10000");
    const transferAmount1 = ethers.parseEther("3000");
    const transferAmount2 = ethers.parseEther("2000");
    
    const initialTotalSupply = await myToken.totalSupply();
    const deployerInitialBalance = await myToken.balanceOf(deployer.address);
    
    // Mint to addr1
    await myToken.mint(addr1.address, mintAmount);
    // Transfer from deployer to addr2
    await myToken.transfer(addr2.address, transferAmount1);
    // Transfer from addr1 to addr2
    await myToken.connect(addr1).transfer(addr2.address, transferAmount2);
    
    // Check total supply remains consistent
    const finalTotalSupply = await myToken.totalSupply();
    expect(finalTotalSupply).to.equal(initialTotalSupply + mintAmount);
    
    // Check individual balances
    const deployerFinalBalance = await myToken.balanceOf(deployer.address);
    const addr1FinalBalance = await myToken.balanceOf(addr1.address);
    const addr2FinalBalance = await myToken.balanceOf(addr2.address);
    
    expect(deployerFinalBalance).to.equal(deployerInitialBalance - transferAmount1);
    expect(addr1FinalBalance).to.equal(mintAmount - transferAmount2);
    expect(addr2FinalBalance).to.equal(transferAmount1 + transferAmount2);
    
    // Verify sum of all balances equals total supply
    expect(deployerFinalBalance + addr1FinalBalance + addr2FinalBalance).to.equal(finalTotalSupply);
  });

  it("Should correctly track balances of zero address", async function () {
    expect(await myToken.balanceOf(ethers.ZeroAddress)).to.equal(0n);
  });

  it("Should show correct balance after minting and transferring", async function () {
    const mintAmount = ethers.parseEther("5000");
    const transferAmount = ethers.parseEther("2000");
    
    await myToken.mint(addr1.address, mintAmount);
    await myToken.connect(addr1).transfer(addr2.address, transferAmount);
    
    expect(await myToken.balanceOf(addr1.address)).to.equal(mintAmount - transferAmount);
    expect(await myToken.balanceOf(addr2.address)).to.equal(transferAmount);
  });

  it("Should verify initial balance equals total supply", async function () {
    const deployerBalance = await myToken.balanceOf(deployer.address);
    const totalSupply = await myToken.totalSupply();
    expect(deployerBalance).to.equal(totalSupply);
    expect(deployerBalance).to.equal(initialSupply);
  });

  it("Should maintain correct balances after partial transfer", async function () {
    const mintAmount = ethers.parseEther("10000");
    const transferAmount = ethers.parseEther("3500");
    
    await myToken.mint(addr1.address, mintAmount);
    const addr1BalanceBefore = await myToken.balanceOf(addr1.address);
    await myToken.connect(addr1).transfer(addr2.address, transferAmount);
    
    expect(await myToken.balanceOf(addr1.address)).to.equal(addr1BalanceBefore - transferAmount);
    expect(await myToken.balanceOf(addr2.address)).to.equal(transferAmount);
  });
});
