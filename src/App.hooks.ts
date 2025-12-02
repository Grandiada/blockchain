import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { MultiSigWallet__factory } from "../types/ethers-contracts/factories/MultiSigWallet.sol/MultiSigWallet__factory.js";
import type { MultiSigWallet } from "../types/ethers-contracts/MultiSigWallet.sol/MultiSigWallet.js";

export const useConnectedWallet = () => {
  const [wallets, setWallets] = useState<string[] | null>(null);

  useEffect(() => {
    let provider: any = null;

    const getWallet = async () => {
      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          setWallets(null);
          return;
        }
        provider = new ethers.BrowserProvider(ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts && accounts.length > 0) {
          setWallets(accounts);
        } else {
          setWallets(null);
        }
      } catch (err) {
        setWallets(null);
      }
    };

    getWallet();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setWallets(accounts);
      } else {
        setWallets(null);
      }
    };

    const ethereum = (window as any).ethereum;
    if (ethereum && ethereum.on) {
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("connect", getWallet);
    }

    return () => {
      if (ethereum && ethereum.removeListener) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("connect", getWallet);
      }
    };
  }, []);

  return {
    wallets,
    connectWallet: async (): Promise<string | null> => {
      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error("MetaMask is not installed.");
        }
        const provider = new ethers.BrowserProvider(ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts && accounts.length > 0) {
          setWallets(accounts);
        } else {
          setWallets(null);
        }
        return accounts[0];
      } catch (err) {
        console.error("Error connecting wallet:", err);
        return null;
      }
    },
    refreshWallets: async () => {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        setWallets(null);
        return;
      }
      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send("eth_accounts", []);
      if (accounts && accounts.length > 0) {
        setWallets(accounts);
      } else {
        setWallets(null);
      }
    },
  };
};

export const useMultiSigWallet = (contractAddress: string | null) => {
  const [contract, setContract] = useState<MultiSigWallet | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [owners, setOwners] = useState<string[]>([]);
  const [requiredConfirmations, setRequiredConfirmations] = useState<bigint | null>(null);
  const [transactionCount, setTransactionCount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize contract connection
  useEffect(() => {
    const initContract = async () => {
      if (!contractAddress) {
        setContract(null);
        setSigner(null);
        return;
      }

      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          setError("MetaMask is not installed");
          return;
        }

        const provider = new ethers.BrowserProvider(ethereum);
        const accounts = await provider.send("eth_accounts", []);
        
        if (accounts && accounts.length > 0) {
          const signerInstance = await provider.getSigner();
          setSigner(signerInstance);
          
          const contractInstance = MultiSigWallet__factory.connect(contractAddress, signerInstance);
          setContract(contractInstance);
          setError(null);
        } else {
          setSigner(null);
          setContract(null);
        }
      } catch (err: any) {
        console.error("Error initializing contract:", err);
        setError(err.message || "Failed to initialize contract");
      }
    };

    initContract();

    // Listen for account changes
    const ethereum = (window as any).ethereum;
    if (ethereum && ethereum.on) {
      const handleAccountsChanged = () => {
        initContract();
      };
      ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      };
    }
  }, [contractAddress]);

  // Load contract data
  const loadContractData = useCallback(async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setError(null);

      const [balanceValue, ownersCount, requiredConfirmationsValue, transactionCountValue] = await Promise.all([
        contract.getBalance(),
        contract.getOwnersCount(),
        contract.requiredConfirmations(),
        contract.getTransactionCount(),
      ]);

      setBalance(balanceValue);
      setRequiredConfirmations(requiredConfirmationsValue);
      setTransactionCount(transactionCountValue);

      // Load all owners
      const ownersList: string[] = [];
      for (let i = 0; i < Number(ownersCount); i++) {
        const owner = await contract.owners(i);
        ownersList.push(owner);
      }
      setOwners(ownersList);
    } catch (err: any) {
      console.error("Error loading contract data:", err);
      setError(err.message || "Failed to load contract data");
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Load data when contract is initialized or changes
  useEffect(() => {
    loadContractData();
  }, [loadContractData]);

  // Submit a transaction
  const submitTransaction = useCallback(async (
    to: string,
    value: bigint | string,
    data: string = "0x"
  ): Promise<bigint | null> => {
    if (!contract) {
      setError("Contract not initialized");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const valueBigInt = typeof value === "string" ? BigInt(value) : value;
      const tx = await contract.submitTransaction(to, valueBigInt, data);
      const receipt = await tx.wait();

      // Find the transaction ID from the event
      const transactionSubmittedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "TransactionSubmitted";
        } catch {
          return false;
        }
      });

      if (transactionSubmittedEvent) {
        const parsed = contract.interface.parseLog(transactionSubmittedEvent);
        const transactionId = parsed?.args[0] as bigint;
        
        await loadContractData();
        return transactionId;
      }

      await loadContractData();
      return null;
    } catch (err: any) {
      console.error("Error submitting transaction:", err);
      setError(err.message || "Failed to submit transaction");
      return null;
    } finally {
      setLoading(false);
    }
  }, [contract, loadContractData]);

  // Confirm a transaction
  const confirmTransaction = useCallback(async (transactionId: bigint | number): Promise<boolean> => {
    if (!contract) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.confirmTransaction(transactionId);
      await tx.wait();
      
      await loadContractData();
      return true;
    } catch (err: any) {
      console.error("Error confirming transaction:", err);
      setError(err.message || "Failed to confirm transaction");
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract, loadContractData]);

  // Revoke a confirmation
  const revokeConfirmation = useCallback(async (transactionId: bigint | number): Promise<boolean> => {
    if (!contract) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.revokeConfirmation(transactionId);
      await tx.wait();
      
      await loadContractData();
      return true;
    } catch (err: any) {
      console.error("Error revoking confirmation:", err);
      setError(err.message || "Failed to revoke confirmation");
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract, loadContractData]);

  // Execute a transaction
  const executeTransaction = useCallback(async (transactionId: bigint | number): Promise<boolean> => {
    if (!contract) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.executeTransaction(transactionId);
      await tx.wait();
      
      await loadContractData();
      return true;
    } catch (err: any) {
      console.error("Error executing transaction:", err);
      setError(err.message || "Failed to execute transaction");
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract, loadContractData]);

  // Change required confirmations
  const changeRequiredConfirmations = useCallback(async (newRequiredConfirmations: bigint | number): Promise<boolean> => {
    if (!contract) {
      setError("Contract not initialized");
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.changeRequiredConfirmations(newRequiredConfirmations);
      await tx.wait();
      
      await loadContractData();
      return true;
    } catch (err: any) {
      console.error("Error changing required confirmations:", err);
      setError(err.message || "Failed to change required confirmations");
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract, loadContractData]);

  // Get a specific transaction
  const getTransaction = useCallback(async (transactionId: bigint | number) => {
    if (!contract) {
      setError("Contract not initialized");
      return null;
    }

    try {
      const transaction = await contract.getTransaction(transactionId);
      return transaction;
    } catch (err: any) {
      console.error("Error getting transaction:", err);
      setError(err.message || "Failed to get transaction");
      return null;
    }
  }, [contract]);

  // Check if a transaction is confirmed by an owner
  const isConfirmed = useCallback(async (transactionId: bigint | number, owner: string): Promise<boolean | null> => {
    if (!contract) {
      setError("Contract not initialized");
      return null;
    }

    try {
      const confirmed = await contract.isConfirmed(transactionId, owner);
      return confirmed;
    } catch (err: any) {
      console.error("Error checking confirmation:", err);
      setError(err.message || "Failed to check confirmation");
      return null;
    }
  }, [contract]);

  // Check if an address is an owner
  const checkIsOwner = useCallback(async (address: string): Promise<boolean | null> => {
    if (!contract) {
      setError("Contract not initialized");
      return null;
    }

    try {
      const isOwner = await contract.isOwner(address);
      return isOwner;
    } catch (err: any) {
      console.error("Error checking owner:", err);
      setError(err.message || "Failed to check owner");
      return null;
    }
  }, [contract]);

  return {
    contract,
    signer,
    balance,
    owners,
    requiredConfirmations,
    transactionCount,
    loading,
    error,
    loadContractData,
    submitTransaction,
    confirmTransaction,
    revokeConfirmation,
    executeTransaction,
    changeRequiredConfirmations,
    getTransaction,
    isConfirmed,
    checkIsOwner,
  };
};
