import { expect } from "chai";
import { network } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import { parseEther, getAddress } from "ethers";
import { MultiSigWallet } from "../types/ethers-contracts/index.js";

const { ethers } = await network.connect();

describe("MultiSigWallet", function () {
  let multiSigWallet: MultiSigWallet;
  
  let owner1: HardhatEthersSigner;
  let owner2: HardhatEthersSigner;
  let nonOwner: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;

  // Hardcoded owner addresses from the contract
  const OWNER1_ADDRESS = "0x7Ba08DbfE0723eb58ea7D255Fcb3ad9125f9EDC3";
  const OWNER2_ADDRESS = "0xf99652997c430cd70a4EA249Fb4d7cCB8faC4875";
  const REQUIRED_CONFIRMATIONS = 2n;

  beforeEach(async function () {
    const [deployer, addr1, addr2, addr3] = await ethers.getSigners();
    recipient = addr3;

    // Deploy the contract
    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWallet.deploy() as unknown as MultiSigWallet;
    await multiSigWallet.waitForDeployment();

    // Get signers for the hardcoded owners
    // Note: In a real test environment, you'd need to impersonate these addresses
    // or have signers that match these addresses
    owner1 = await ethers.getImpersonatedSigner(OWNER1_ADDRESS);
    owner2 = await ethers.getImpersonatedSigner(OWNER2_ADDRESS);
    nonOwner = addr1;

    // Fund the impersonated accounts if needed
    await deployer.sendTransaction({
      to: OWNER1_ADDRESS,
      value: parseEther("10"),
    });
    await deployer.sendTransaction({
      to: OWNER2_ADDRESS,
      value: parseEther("10"),
    });
  });

  describe("Deployment", function () {
    it("Should deploy with correct owners", async function () {
      expect(await multiSigWallet.isOwner(OWNER1_ADDRESS)).to.be.true;
      expect(await multiSigWallet.isOwner(OWNER2_ADDRESS)).to.be.true;
      expect(await multiSigWallet.getOwnersCount()).to.equal(2n);
    });

    it("Should set correct required confirmations", async function () {
      expect(await multiSigWallet.requiredConfirmations()).to.equal(
        REQUIRED_CONFIRMATIONS
      );
    });

    it("Should not allow non-owners", async function () {
      expect(await multiSigWallet.isOwner(nonOwner.address)).to.be.false;
    });
  });

  describe("Submitting Transactions", function () {
    it("Should allow owner to submit a transaction", async function () {
      const value = parseEther("1");
      const tx = await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, value, "0x");

      await expect(tx)
        .to.emit(multiSigWallet, "TransactionSubmitted")
        .withArgs(0n, recipient.address, value, "0x");

      const transaction = await multiSigWallet.getTransaction(0);
      expect(transaction.to).to.equal(recipient.address);
      expect(transaction.value).to.equal(value);
      expect(transaction.executed).to.be.false;
    });

    it("Should auto-confirm transaction by submitter", async function () {
      const value = parseEther("1");
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, value, "0x");

      const isConfirmed = await multiSigWallet.isConfirmed(0, OWNER1_ADDRESS);
      expect(isConfirmed).to.be.true;

      const transaction = await multiSigWallet.getTransaction(0);
      expect(transaction.confirmationsCount).to.equal(1n);
    });

    it("Should not allow non-owner to submit transaction", async function () {
      const value = parseEther("1");
      await expect(
        multiSigWallet
          .connect(nonOwner)
          .submitTransaction(recipient.address, value, "0x")
      ).to.be.revertedWith("MultiSigWallet: caller is not an owner");
    });

    it("Should reject transaction with zero address", async function () {
      const value = parseEther("1");
      await expect(
        multiSigWallet
          .connect(owner1)
          .submitTransaction(ethers.ZeroAddress, value, "0x")
      ).to.be.revertedWith("MultiSigWallet: invalid destination address");
    });
  });

  describe("Confirming Transactions", function () {
    beforeEach(async function () {
      // Fund the wallet
      await owner1.sendTransaction({
        to: await multiSigWallet.getAddress(),
        value: parseEther("5"),
      });

      // Submit a transaction
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("1"), "0x");
    });

    it("Should allow owner to confirm transaction", async function () {
      const tx = await multiSigWallet.connect(owner2).confirmTransaction(0);

      await expect(tx)
        .to.emit(multiSigWallet, "TransactionConfirmed")
        .withArgs(0n, OWNER2_ADDRESS);

      const isConfirmed = await multiSigWallet.isConfirmed(0, OWNER2_ADDRESS);
      expect(isConfirmed).to.be.true;

      const transaction = await multiSigWallet.getTransaction(0);
      expect(transaction.confirmationsCount).to.equal(2n);
    });

    it("Should auto-execute when required confirmations are met", async function () {
      const recipientBalanceBefore = await ethers.provider.getBalance(
        recipient.address
      );

      // Owner2 confirms, which should trigger auto-execution (2 confirmations = required)
      const tx = await multiSigWallet.connect(owner2).confirmTransaction(0);

      await expect(tx)
        .to.emit(multiSigWallet, "TransactionConfirmed")
        .withArgs(0n, OWNER2_ADDRESS);

      await expect(tx)
        .to.emit(multiSigWallet, "TransactionExecuted")
        .withArgs(0n);

      const transaction = await multiSigWallet.getTransaction(0);
      expect(transaction.executed).to.be.true;
      expect(transaction.confirmationsCount).to.equal(2n);

      const recipientBalanceAfter = await ethers.provider.getBalance(
        recipient.address
      );
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(
        parseEther("1")
      );
    });

    it("Should not allow non-owner to confirm", async function () {
      await expect(
        multiSigWallet.connect(nonOwner).confirmTransaction(0)
      ).to.be.revertedWith("MultiSigWallet: caller is not an owner");
    });

    it("Should not allow duplicate confirmation", async function () {
      // Create a new transaction for this test
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("0.1"), "0x");

      // Owner2 confirms for the first time (this will auto-execute)
      await multiSigWallet.connect(owner2).confirmTransaction(1);

      // Try to confirm again (should fail because already executed)
      await expect(
        multiSigWallet.connect(owner2).confirmTransaction(1)
      ).to.be.revertedWith("MultiSigWallet: transaction already executed");
    });

    it("Should not allow confirming executed transaction", async function () {
      // Get both confirmations to execute
      await multiSigWallet.connect(owner2).confirmTransaction(0);

      // Try to confirm again after execution
      await expect(
        multiSigWallet.connect(owner1).confirmTransaction(0)
      ).to.be.revertedWith("MultiSigWallet: transaction already executed");
    });
  });

  describe("Executing Transactions", function () {
    beforeEach(async function () {
      // Fund the wallet
      await owner1.sendTransaction({
        to: await multiSigWallet.getAddress(),
        value: parseEther("5"),
      });

      // Submit transaction (owner1 auto-confirms, so we have 1 confirmation)
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("1"), "0x");
      // Don't confirm with owner2 here - we'll do it in individual tests
    });

    it("Should execute transaction with sufficient confirmations", async function () {
      const recipientBalanceBefore = await ethers.provider.getBalance(
        recipient.address
      );

      // Now confirm with owner2, which should trigger auto-execution
      const tx = await multiSigWallet.connect(owner2).confirmTransaction(0);

      await expect(tx)
        .to.emit(multiSigWallet, "TransactionConfirmed")
        .withArgs(0n, OWNER2_ADDRESS);

      await expect(tx)
        .to.emit(multiSigWallet, "TransactionExecuted")
        .withArgs(0n);

      const transaction = await multiSigWallet.getTransaction(0);
      expect(transaction.executed).to.be.true;
      expect(transaction.confirmationsCount).to.equal(2n);

      const recipientBalanceAfter = await ethers.provider.getBalance(
        recipient.address
      );
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(
        parseEther("1")
      );
    });

    it("Should not execute transaction without sufficient confirmations", async function () {
      // Create a new transaction with only one confirmation
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("0.5"), "0x");

      await expect(
        multiSigWallet.connect(owner1).executeTransaction(1)
      ).to.be.revertedWith("MultiSigWallet: insufficient confirmations");
    });

    it("Should not allow executing already executed transaction", async function () {
      // First, confirm with owner2 to trigger auto-execution
      await multiSigWallet.connect(owner2).confirmTransaction(0);

      // Try to execute again (should fail because already executed)
      await expect(
        multiSigWallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWith("MultiSigWallet: transaction already executed");
    });

    it("Should not allow non-owner to execute", async function () {
      await expect(
        multiSigWallet.connect(nonOwner).executeTransaction(0)
      ).to.be.revertedWith("MultiSigWallet: caller is not an owner");
    });
  });

  describe("Revoking Confirmations", function () {
    beforeEach(async function () {
      // Fund the wallet
      await owner1.sendTransaction({
        to: await multiSigWallet.getAddress(),
        value: parseEther("5"),
      });
    });

    it("Should allow owner to revoke their confirmation before execution", async function () {
      // Submit transaction (owner1 auto-confirms = 1 confirmation)
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("0.5"), "0x");

      // Owner2 confirms (now we have 2 confirmations, but we'll test revoking owner1's confirmation)
      // Actually, with 2 owners and 2 required, once owner2 confirms it auto-executes
      // So we need to test revoking owner1's confirmation BEFORE owner2 confirms
      const tx = await multiSigWallet.connect(owner1).revokeConfirmation(0);

      await expect(tx)
        .to.emit(multiSigWallet, "TransactionRevoked")
        .withArgs(0n, OWNER1_ADDRESS);

      const isConfirmed = await multiSigWallet.isConfirmed(0, OWNER1_ADDRESS);
      expect(isConfirmed).to.be.false;

      const transaction = await multiSigWallet.getTransaction(0);
      expect(transaction.confirmationsCount).to.equal(0n);

      // Now owner2 can confirm, and it won't auto-execute (only 1 confirmation)
      await multiSigWallet.connect(owner2).confirmTransaction(0);
      const transactionAfter = await multiSigWallet.getTransaction(0);
      expect(transactionAfter.confirmationsCount).to.equal(1n);
      expect(transactionAfter.executed).to.be.false;
    });

    it("Should not allow revoking if not confirmed", async function () {
      // Create a new transaction
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("0.3"), "0x");

      // Owner1 already confirmed (auto-confirmed on submit)
      // Owner2 hasn't confirmed yet, so trying to revoke should fail
      await expect(
        multiSigWallet.connect(owner2).revokeConfirmation(0)
      ).to.be.revertedWith("MultiSigWallet: transaction not confirmed");
    });

    it("Should not allow revoking after execution", async function () {
      // Create a new transaction and let it auto-execute
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("0.2"), "0x");
      await multiSigWallet.connect(owner2).confirmTransaction(0); // This will auto-execute

      // Try to revoke after execution
      await expect(
        multiSigWallet.connect(owner1).revokeConfirmation(0)
      ).to.be.revertedWith("MultiSigWallet: transaction already executed");
    });

    it("Should not allow non-owner to revoke", async function () {
      // Create a new transaction for this test
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("0.1"), "0x");

      await expect(
        multiSigWallet.connect(nonOwner).revokeConfirmation(0)
      ).to.be.revertedWith("MultiSigWallet: caller is not an owner");
    });
  });

  describe("Token Transfers", function () {
    let token: any;

    beforeEach(async function () {
      // Deploy a test token
      const TestToken = await ethers.getContractFactory("TestToken");
      token = await TestToken.deploy(parseEther("1000000"));
      await token.waitForDeployment();

      // Transfer tokens to the multisig wallet
      await token.transfer(
        await multiSigWallet.getAddress(),
        parseEther("1000")
      );
    });

    it("Should allow transferring tokens via transaction", async function () {
      const transferAmount = parseEther("100");
      const transferData = token.interface.encodeFunctionData("transfer", [
        recipient.address,
        transferAmount,
      ]);

      // Submit transaction
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(await token.getAddress(), 0n, transferData);

      // Check balances before execution
      const recipientBalanceBefore = await token.balanceOf(recipient.address);
      const walletBalanceBefore = await token.balanceOf(
        await multiSigWallet.getAddress()
      );

      // Confirm by second owner (this will auto-execute)
      await multiSigWallet.connect(owner2).confirmTransaction(0);

      // Check balances after execution
      const recipientBalanceAfter = await token.balanceOf(recipient.address);
      const walletBalanceAfter = await token.balanceOf(
        await multiSigWallet.getAddress()
      );

      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(
        transferAmount
      );
      expect(walletBalanceBefore - walletBalanceAfter).to.equal(transferAmount);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Fund the wallet
      await owner1.sendTransaction({
        to: await multiSigWallet.getAddress(),
        value: parseEther("5"),
      });

      // Submit a transaction
      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("1"), "0x");
    });

    it("Should return correct transaction count", async function () {
      expect(await multiSigWallet.getTransactionCount()).to.equal(1n);

      await multiSigWallet
        .connect(owner1)
        .submitTransaction(recipient.address, parseEther("0.5"), "0x");

      expect(await multiSigWallet.getTransactionCount()).to.equal(2n);
    });

    it("Should return correct transaction details", async function () {
      const transaction = await multiSigWallet.getTransaction(0);
      expect(transaction.to).to.equal(recipient.address);
      expect(transaction.value).to.equal(parseEther("1"));
      expect(transaction.executed).to.be.false;
      expect(transaction.confirmationsCount).to.equal(1n);
    });

    it("Should return correct balance", async function () {
      const balance = await multiSigWallet.getBalance();
      expect(balance).to.equal(parseEther("5"));
    });
  });

  describe("Receive Function", function () {
    it("Should accept Ether deposits", async function () {
      const depositAmount = parseEther("10");
      const tx = await owner1.sendTransaction({
        to: await multiSigWallet.getAddress(),
        value: depositAmount,
      });

      await expect(tx)
        .to.emit(multiSigWallet, "Deposit")
        .withArgs(OWNER1_ADDRESS, depositAmount);

      const balance = await multiSigWallet.getBalance();
      expect(balance).to.equal(depositAmount);
    });
  });
});
