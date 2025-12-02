// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title MultiSigWallet
 * @dev A multi-signature wallet that requires multiple owner confirmations to execute transactions
 */
contract MultiSigWallet {
    // ============ Data Structures ============

    /**
     * @dev Transaction structure to store transaction details
     */
    struct Transaction {
        address to; // Destination address
        uint256 value; // Amount of Ether to send
        bytes data; // Transaction data (for token transfers or contract calls)
        bool executed; // Whether the transaction has been executed
        uint256 confirmationsCount; // Number of confirmations received
    }

    // ============ State Variables ============

    address[] public owners; // Array of owner addresses
    mapping(address => bool) public isOwner; // Mapping to check if an address is an owner
    uint256 public requiredConfirmations; // Number of confirmations required to execute

    Transaction[] public transactions; // Array of all transactions
    mapping(uint256 => mapping(address => bool)) public confirmations; // Mapping: transactionId => owner => confirmed

    // ============ Events ============

    event Deposit(address indexed sender, uint256 amount);
    event TransactionSubmitted(
        uint256 indexed transactionId,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TransactionConfirmed(
        uint256 indexed transactionId,
        address indexed owner
    );
    event TransactionRevoked(
        uint256 indexed transactionId,
        address indexed owner
    );
    event TransactionExecuted(uint256 indexed transactionId);
    event OwnerAdded(address indexed owner);
    event RequiredConfirmationsChanged(
        uint256 oldRequired,
        uint256 newRequired
    );

    // ============ Modifiers ============

    /**
     * @dev Modifier to check if the caller is an owner
     */
    modifier onlyOwner() {
        require(isOwner[msg.sender], "MultiSigWallet: caller is not an owner");
        _;
    }

    /**
     * @dev Modifier to check if a transaction exists
     */
    modifier transactionExists(uint256 _transactionId) {
        require(
            _transactionId < transactions.length,
            "MultiSigWallet: transaction does not exist"
        );
        _;
    }

    /**
     * @dev Modifier to check if a transaction has not been executed
     */
    modifier notExecuted(uint256 _transactionId) {
        require(
            !transactions[_transactionId].executed,
            "MultiSigWallet: transaction already executed"
        );
        _;
    }

    /**
     * @dev Modifier to check if a transaction has not been confirmed by the caller
     */
    modifier notConfirmed(uint256 _transactionId) {
        require(
            !confirmations[_transactionId][msg.sender],
            "MultiSigWallet: transaction already confirmed"
        );
        _;
    }

    /**
     * @dev Modifier to check if a transaction has been confirmed by the caller
     */
    modifier confirmed(uint256 _transactionId) {
        require(
            confirmations[_transactionId][msg.sender],
            "MultiSigWallet: transaction not confirmed"
        );
        _;
    }

    // ============ Constructor ============

    /**
     * @dev Constructor that initializes the wallet with hardcoded owners
     */
    constructor() {
        // Hardcoded owner addresses
        address[2] memory _owners = [
            0x7Ba08DbfE0723eb58ea7D255Fcb3ad9125f9EDC3,
            0xf99652997c430cd70a4EA249Fb4d7cCB8faC4875
        ];

        // Initialize owners
        for (uint256 i = 0; i < _owners.length; i++) {
            require(
                _owners[i] != address(0),
                "MultiSigWallet: invalid owner address"
            );

            isOwner[_owners[i]] = true;
            owners.push(_owners[i]);
            emit OwnerAdded(_owners[i]);
        }

        // Require both owners to confirm (2 out of 2)
        requiredConfirmations = 2;
    }

    // ============ Receive Function ============

    /**
     * @dev Allows the contract to receive Ether
     */
    receive() external payable {
        if (msg.value > 0) {
            emit Deposit(msg.sender, msg.value);
        }
    }

    // ============ Public Functions ============

    /**
     * @dev Submit a new transaction proposal
     * @param _to Destination address
     * @param _value Amount of Ether to send
     * @param _data Transaction data (for token transfers or contract calls)
     * @return transactionId The ID of the newly created transaction
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner returns (uint256 transactionId) {
        require(
            _to != address(0),
            "MultiSigWallet: invalid destination address"
        );

        transactionId = transactions.length;
        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                confirmationsCount: 0
            })
        );

        emit TransactionSubmitted(transactionId, _to, _value, _data);

        // Auto-confirm by the submitter
        confirmTransaction(transactionId);
    }

    /**
     * @dev Confirm a transaction by an owner
     * @param _transactionId The ID of the transaction to confirm
     */
    function confirmTransaction(
        uint256 _transactionId
    )
        public
        onlyOwner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
        notConfirmed(_transactionId)
    {
        confirmations[_transactionId][msg.sender] = true;
        transactions[_transactionId].confirmationsCount++;

        emit TransactionConfirmed(_transactionId, msg.sender);

        // Auto-execute if threshold is met
        if (
            transactions[_transactionId].confirmationsCount >=
            requiredConfirmations
        ) {
            executeTransaction(_transactionId);
        }
    }

    /**
     * @dev Revoke a confirmation before execution
     * @param _transactionId The ID of the transaction to revoke confirmation from
     */
    function revokeConfirmation(
        uint256 _transactionId
    )
        public
        onlyOwner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
        confirmed(_transactionId)
    {
        confirmations[_transactionId][msg.sender] = false;
        transactions[_transactionId].confirmationsCount--;

        emit TransactionRevoked(_transactionId, msg.sender);
    }

    /**
     * @dev Execute a confirmed transaction
     * @param _transactionId The ID of the transaction to execute
     */
    function executeTransaction(
        uint256 _transactionId
    )
        public
        onlyOwner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
    {
        Transaction storage transaction = transactions[_transactionId];

        require(
            transaction.confirmationsCount >= requiredConfirmations,
            "MultiSigWallet: insufficient confirmations"
        );

        transaction.executed = true;

        // Execute the transaction
        // If the transaction is to this contract, it will call an internal function
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "MultiSigWallet: transaction execution failed");

        emit TransactionExecuted(_transactionId);
    }

    /**
     * @dev Change the required number of confirmations
     * @param _newRequiredConfirmations The new required number of confirmations
     * @notice This function can only be called through a multi-sig transaction execution
     * @notice The new required confirmations must be between 1 and the number of owners
     */
    function changeRequiredConfirmations(
        uint256 _newRequiredConfirmations
    ) public {
        // Only allow this function to be called when executing a transaction
        // When called from executeTransaction, msg.sender will be the contract itself
        require(
            msg.sender == address(this),
            "MultiSigWallet: can only be called through transaction execution"
        );

        require(
            _newRequiredConfirmations > 0 &&
                _newRequiredConfirmations <= owners.length,
            "MultiSigWallet: invalid number of required confirmations"
        );

        uint256 oldRequired = requiredConfirmations;
        requiredConfirmations = _newRequiredConfirmations;

        emit RequiredConfirmationsChanged(
            oldRequired,
            _newRequiredConfirmations
        );
    }

    // ============ View Functions ============

    /**
     * @dev Get the number of owners
     * @return The number of owners
     */
    function getOwnersCount() public view returns (uint256) {
        return owners.length;
    }

    /**
     * @dev Get the number of transactions
     * @return The number of transactions
     */
    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    /**
     * @dev Get transaction details
     * @param _transactionId The ID of the transaction
     * @return to Destination address
     * @return value Amount of Ether
     * @return data Transaction data
     * @return executed Whether the transaction has been executed
     * @return confirmationsCount Number of confirmations
     */
    function getTransaction(
        uint256 _transactionId
    )
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 confirmationsCount
        )
    {
        require(
            _transactionId < transactions.length,
            "MultiSigWallet: transaction does not exist"
        );
        Transaction storage transaction = transactions[_transactionId];
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.confirmationsCount
        );
    }

    /**
     * @dev Check if a transaction is confirmed by a specific owner
     * @param _transactionId The ID of the transaction
     * @param _owner The owner address to check
     * @return Whether the transaction is confirmed by the owner
     */
    function isConfirmed(
        uint256 _transactionId,
        address _owner
    ) public view returns (bool) {
        return confirmations[_transactionId][_owner];
    }

    /**
     * @dev Get the contract's balance
     * @return The contract's Ether balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
