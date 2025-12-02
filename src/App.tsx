import { useState, useEffect } from "react";
import "./App.css";
import { useConnectedWallet, useMultiSigWallet } from "./App.hooks";
import { ethers } from "ethers";

function App() {
  const { wallets, connectWallet, refreshWallets } = useConnectedWallet();
  const contractAddress = "0x9971fD80c2b6CCeFde9f05d67dc8ADeD3Df2B340";
  const {
    contract,
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
    getTransaction,
    isConfirmed,
    checkIsOwner,
  } = useMultiSigWallet(contractAddress);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitFormData, setSubmitFormData] = useState({
    to: "",
    value: "",
    data: "0x",
  });
  const [newRequiredConfirmations, setNewRequiredConfirmations] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isUserOwner, setIsUserOwner] = useState<boolean | null>(null);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (wallets && wallets.length > 0) {
        setCurrentUser(wallets[0]);
        if (checkIsOwner) {
          const ownerStatus = await checkIsOwner(wallets[0]);
          setIsUserOwner(ownerStatus);
        }
      } else {
        setCurrentUser(null);
        setIsUserOwner(null);
      }
    };
    loadCurrentUser();
  }, [wallets, checkIsOwner]);

  // Load all transactions
  useEffect(() => {
    const loadTransactions = async () => {
      if (!contract || !transactionCount) return;

      const txList: any[] = [];
      const count = Number(transactionCount);

      for (let i = 0; i < count; i++) {
        try {
          const tx = await getTransaction(i);
          if (tx) {
            const [to, value, data, executed, confirmationsCount] = tx;
            
            // Check which owners confirmed this transaction
            const confirmedBy: string[] = [];
            for (const owner of owners) {
              const confirmed = await isConfirmed(i, owner);
              if (confirmed) {
                confirmedBy.push(owner);
              }
            }

            txList.push({
              id: i,
              to,
              value,
              data,
              executed,
              confirmationsCount: Number(confirmationsCount),
              confirmedBy,
            });
          }
        } catch (err) {
          console.error(`Error loading transaction ${i}:`, err);
        }
      }

      setTransactions(txList.reverse()); // Show newest first
    };

    loadTransactions();
  }, [contract, transactionCount, owners, getTransaction, isConfirmed]);

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitFormData.to) {
      alert("Please enter a destination address");
      return;
    }

    try {
      const valueInWei = ethers.parseEther(submitFormData.value || "0");
      const txId = await submitTransaction(
        submitFormData.to,
        valueInWei,
        submitFormData.data || "0x"
      );
      
      if (txId !== null) {
        setSubmitFormData({ to: "", value: "", data: "0x" });
        setShowSubmitForm(false);
        setTimeout(() => loadContractData(), 2000); // Reload after a delay
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };


  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEther = (value: bigint) => {
    return ethers.formatEther(value);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>MultiSig Wallet</h1>
        <div className="wallet-section">
          <button
            className="connect-button"
            onClick={() => {
              if (!wallets) {
                connectWallet();
              } else {
                refreshWallets();
              }
            }}
          >
            {wallets ? "Refresh Wallet" : "Connect Wallet"}
          </button>
          {wallets && wallets.length > 0 && (
            <div className="wallet-info">
              <p className="wallet-address">{formatAddress(wallets[0])}</p>
              {isUserOwner !== null && (
                <span className={`owner-badge ${isUserOwner ? "owner" : "not-owner"}`}>
                  {isUserOwner ? "Owner" : "Not Owner"}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {!contract && (
        <div className="info-message">
          <p>Please connect your wallet to interact with the contract.</p>
        </div>
      )}

      {contract && (
        <div className="main-content">
          {/* Contract Information */}
          <section className="contract-info">
            <h2>Contract Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Contract Address</label>
                <p className="address">{formatAddress(contractAddress)}</p>
              </div>
              <div className="info-item">
                <label>Balance</label>
                <p className="balance">
                  {balance !== null ? `${formatEther(balance)} ETH` : "Loading..."}
                </p>
              </div>
              <div className="info-item">
                <label>Owners</label>
                <p>{owners.length}</p>
                <div className="owners-list">
                  {owners.map((owner, idx) => (
                    <span key={idx} className="owner-tag">
                      {formatAddress(owner)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="info-item">
                <label>Required Confirmations</label>
                <p>
                  {requiredConfirmations !== null
                    ? `${requiredConfirmations} / ${owners.length}`
                    : "Loading..."}
                </p>
              </div>
              <div className="info-item">
                <label>Total Transactions</label>
                <p>{transactionCount !== null ? Number(transactionCount) : "Loading..."}</p>
              </div>
            </div>
            <div className="action-buttons">
              <button onClick={loadContractData} disabled={loading}>
                {loading ? "Loading..." : "Refresh Data"}
              </button>
              {isUserOwner && (
                <>
                  <button onClick={() => setShowSubmitForm(!showSubmitForm)}>
                    {showSubmitForm ? "Cancel" : "Submit Transaction"}
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Submit Transaction Form */}
          {showSubmitForm && isUserOwner && (
            <section className="form-section">
              <h2>Submit New Transaction</h2>
              <form onSubmit={handleSubmitTransaction}>
                <div className="form-group">
                  <label>To Address</label>
                  <input
                    type="text"
                    value={submitFormData.to}
                    onChange={(e) =>
                      setSubmitFormData({ ...submitFormData, to: e.target.value })
                    }
                    placeholder="0x..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Value (ETH)</label>
                  <input
                    type="text"
                    value={submitFormData.value}
                    onChange={(e) =>
                      setSubmitFormData({ ...submitFormData, value: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>
                <div className="form-group">
                  <label>Data (hex)</label>
                  <input
                    type="text"
                    value={submitFormData.data}
                    onChange={(e) =>
                      setSubmitFormData({ ...submitFormData, data: e.target.value })
                    }
                    placeholder="0x"
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Transaction"}
                </button>
              </form>
            </section>
          )}

          {/* Transactions List */}
          <section className="transactions-section">
            <h2>Transactions</h2>
            {loading && transactions.length === 0 ? (
              <p>Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <div className="transactions-list">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`transaction-card ${tx.executed ? "executed" : ""}`}
                  >
                    <div className="transaction-header">
                      <span className="transaction-id">Transaction #{tx.id}</span>
                      <span
                        className={`status-badge ${
                          tx.executed
                            ? "executed"
                            : tx.confirmationsCount >= Number(requiredConfirmations || 0)
                            ? "ready"
                            : "pending"
                        }`}
                      >
                        {tx.executed
                          ? "Executed"
                          : tx.confirmationsCount >= Number(requiredConfirmations || 0)
                          ? "Ready to Execute"
                          : "Pending"}
                      </span>
                    </div>
                    <div className="transaction-details">
                      <div className="detail-row">
                        <label>To:</label>
                        <span className="address">{formatAddress(tx.to)}</span>
                      </div>
                      <div className="detail-row">
                        <label>Value:</label>
                        <span>{formatEther(tx.value)} ETH</span>
                      </div>
                      <div className="detail-row">
                        <label>Confirmations:</label>
                        <span>
                          {tx.confirmationsCount} / {requiredConfirmations || 0}
                        </span>
                      </div>
                      {tx.confirmedBy.length > 0 && (
                        <div className="detail-row">
                          <label>Confirmed by:</label>
                          <div className="confirmed-by">
                            {tx.confirmedBy.map((owner: string, idx: number) => (
                              <span key={idx} className="owner-tag">
                                {formatAddress(owner)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!tx.executed && isUserOwner && currentUser && (
                      <div className="transaction-actions">
                        {!tx.confirmedBy.includes(currentUser) ? (
                          <button
                            onClick={async () => {
                              if (await confirmTransaction(tx.id)) {
                                setTimeout(() => loadContractData(), 2000);
                              }
                            }}
                            disabled={loading}
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (await revokeConfirmation(tx.id)) {
                                setTimeout(() => loadContractData(), 2000);
                              }
                            }}
                            disabled={loading}
                          >
                            Revoke
                          </button>
                        )}
                        {tx.confirmationsCount >= Number(requiredConfirmations || 0) && (
                          <button
                            onClick={async () => {
                              if (await executeTransaction(tx.id)) {
                                setTimeout(() => loadContractData(), 2000);
                              }
                            }}
                            disabled={loading}
                            className="execute-button"
                          >
                            Execute
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
