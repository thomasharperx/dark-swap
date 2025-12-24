// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IConfidentialUSDT {
    function mint(address to, uint64 amount) external;
    function decimals() external view returns (uint8);
}

contract DarkSwap {
    uint256 public constant CUSDT_PER_ETH = 2300;
    uint256 public constant CUSDT_DECIMALS = 1_000_000;
    uint256 public constant RATE_NUMERATOR = CUSDT_PER_ETH * CUSDT_DECIMALS;
    uint256 public constant RATE_DENOMINATOR = 1 ether;

    address public immutable cusdt;
    address public owner;

    event Swapped(address indexed sender, address indexed recipient, uint256 ethAmount, uint64 cusdtAmount);
    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event Withdrawal(address indexed recipient, uint256 amount);

    error InvalidRecipient();
    error InsufficientEth();
    error AmountOverflow();
    error NotOwner();
    error UnsupportedDecimals(uint8 tokenDecimals);

    constructor(address cusdtAddress) {
        if (cusdtAddress == address(0)) {
            revert InvalidRecipient();
        }

        uint8 tokenDecimals = IConfidentialUSDT(cusdtAddress).decimals();
        if (tokenDecimals != 6) {
            revert UnsupportedDecimals(tokenDecimals);
        }

        cusdt = cusdtAddress;
        owner = msg.sender;
        emit OwnerUpdated(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    function quoteCusdt(uint256 ethAmountWei) public pure returns (uint64) {
        if (ethAmountWei == 0) {
            return 0;
        }

        uint256 cusdtAmount = (ethAmountWei * RATE_NUMERATOR) / RATE_DENOMINATOR;
        if (cusdtAmount > type(uint64).max) {
            revert AmountOverflow();
        }

        return uint64(cusdtAmount);
    }

    function swapEthForCusdt(address recipient) external payable returns (uint64) {
        if (recipient == address(0)) {
            revert InvalidRecipient();
        }

        uint64 cusdtAmount = quoteCusdt(msg.value);
        if (cusdtAmount == 0) {
            revert InsufficientEth();
        }

        IConfidentialUSDT(cusdt).mint(recipient, cusdtAmount);
        emit Swapped(msg.sender, recipient, msg.value, cusdtAmount);
        return cusdtAmount;
    }

    function swapEthForMyCusdt() external payable returns (uint64) {
        uint64 cusdtAmount = quoteCusdt(msg.value);
        if (cusdtAmount == 0) {
            revert InsufficientEth();
        }

        IConfidentialUSDT(cusdt).mint(msg.sender, cusdtAmount);
        emit Swapped(msg.sender, msg.sender, msg.value, cusdtAmount);
        return cusdtAmount;
    }

    function updateOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert InvalidRecipient();
        }
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    function withdraw(address payable recipient, uint256 amount) external onlyOwner {
        if (recipient == address(0)) {
            revert InvalidRecipient();
        }
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Withdraw failed");
        emit Withdrawal(recipient, amount);
    }

    receive() external payable {
        uint64 cusdtAmount = quoteCusdt(msg.value);
        if (cusdtAmount == 0) {
            revert InsufficientEth();
        }

        IConfidentialUSDT(cusdt).mint(msg.sender, cusdtAmount);
        emit Swapped(msg.sender, msg.sender, msg.value, cusdtAmount);
    }
}
