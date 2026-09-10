// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MemeToken} from "./MemeToken.sol";

/// @title Zump.fun launchpad on BOT Chain
/// @notice Native-BOT linear bonding curve. No privacy / ZK.
contract PumpFactory {
    uint256 private constant WAD = 1e18;

    struct Launch {
        address token;
        address creator;
        uint256 basePrice;
        uint256 slope;
        uint256 maxSupply;
        uint256 tokensSold;
        uint256 reserveBalance;
        uint64 createdAt;
    }

    address public immutable tokenImplementation;
    address public feeReceiver;
    uint16 public feeBps;
    address public owner;

    Launch[] public launches;
    mapping(address => uint256) public launchIdOf; // token => id + 1

    event LaunchCreated(
        uint256 indexed id,
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 basePrice,
        uint256 slope,
        uint256 maxSupply
    );
    event Buy(
        uint256 indexed id,
        address indexed buyer,
        uint256 tokens,
        uint256 cost,
        uint256 fee
    );
    event Sell(
        uint256 indexed id,
        address indexed seller,
        uint256 tokens,
        uint256 refund,
        uint256 fee
    );
    event FeeConfigUpdated(address receiver, uint16 bps);

    modifier onlyOwner() {
        require(msg.sender == owner, "owner");
        _;
    }

    constructor(address feeReceiver_, uint16 feeBps_) {
        require(feeReceiver_ != address(0), "fee");
        require(feeBps_ <= 1000, "fee bps");
        owner = msg.sender;
        feeReceiver = feeReceiver_;
        feeBps = feeBps_;
        tokenImplementation = address(new MemeToken());
    }

    receive() external payable {}

    function setFeeConfig(address receiver, uint16 bps) external onlyOwner {
        require(receiver != address(0), "fee");
        require(bps <= 1000, "fee bps");
        feeReceiver = receiver;
        feeBps = bps;
        emit FeeConfigUpdated(receiver, bps);
    }

    function launchCount() external view returns (uint256) {
        return launches.length;
    }

    function getLaunch(uint256 id) external view returns (Launch memory) {
        return launches[id];
    }

    function currentPrice(uint256 id) public view returns (uint256) {
        Launch storage launch = launches[id];
        return launch.basePrice + (launch.slope * launch.tokensSold) / WAD;
    }

    function quoteBuy(uint256 id, uint256 amount) public view returns (uint256 cost, uint256 fee) {
        Launch storage launch = launches[id];
        cost = _quote(launch, launch.tokensSold, amount);
        fee = (cost * feeBps) / 10_000;
    }

    function quoteSell(uint256 id, uint256 amount) public view returns (uint256 refund, uint256 fee) {
        Launch storage launch = launches[id];
        require(amount <= launch.tokensSold, "sold");
        uint256 gross = _quote(launch, launch.tokensSold - amount, amount);
        fee = (gross * feeBps) / 10_000;
        refund = gross - fee;
        if (refund > launch.reserveBalance) refund = launch.reserveBalance;
    }

    function createLaunch(
        string calldata name,
        string calldata symbol,
        uint256 basePrice,
        uint256 slope,
        uint256 maxSupply
    ) external returns (uint256 id, address token) {
        require(bytes(name).length > 0 && bytes(symbol).length > 0, "meta");
        require(basePrice > 0 && maxSupply > 0 && maxSupply % WAD == 0, "params");

        token = _clone(tokenImplementation);
        MemeToken(token).initialize(name, symbol);

        id = launches.length;
        launches.push(
            Launch({
                token: token,
                creator: msg.sender,
                basePrice: basePrice,
                slope: slope,
                maxSupply: maxSupply,
                tokensSold: 0,
                reserveBalance: 0,
                createdAt: uint64(block.timestamp)
            })
        );
        launchIdOf[token] = id + 1;
        emit LaunchCreated(id, token, msg.sender, name, symbol, basePrice, slope, maxSupply);
    }

    function buy(uint256 id, uint256 amount) external payable {
        require(amount > 0, "amount");
        Launch storage launch = launches[id];
        require(launch.tokensSold + amount <= launch.maxSupply, "supply");

        (uint256 cost, uint256 fee) = quoteBuy(id, amount);
        require(msg.value >= cost, "bot");

        launch.tokensSold += amount;
        launch.reserveBalance += cost - fee;
        MemeToken(launch.token).mint(msg.sender, amount);

        if (fee > 0) {
            (bool okFee,) = feeReceiver.call{value: fee}("");
            require(okFee, "fee xfer");
        }
        uint256 refund = msg.value - cost;
        if (refund > 0) {
            (bool okRefund,) = msg.sender.call{value: refund}("");
            require(okRefund, "refund");
        }
        emit Buy(id, msg.sender, amount, cost, fee);
    }

    function sell(uint256 id, uint256 amount) external {
        require(amount > 0, "amount");
        Launch storage launch = launches[id];
        require(amount <= launch.tokensSold, "sold");

        (uint256 refund, uint256 fee) = quoteSell(id, amount);
        require(refund > 0, "liquidity");

        MemeToken(launch.token).burn(msg.sender, amount);
        launch.tokensSold -= amount;
        launch.reserveBalance -= refund;

        (bool ok,) = msg.sender.call{value: refund}("");
        require(ok, "payout");
        emit Sell(id, msg.sender, amount, refund, fee);
    }

    function _quote(Launch storage launch, uint256 sold, uint256 amount) internal view returns (uint256) {
        require(amount > 0, "amount");
        uint256 startPrice = launch.basePrice + (launch.slope * sold) / WAD;
        uint256 endPrice = launch.basePrice + (launch.slope * (sold + amount)) / WAD;
        return (amount * (startPrice + endPrice)) / (2 * WAD);
    }

    function _clone(address impl) internal returns (address instance) {
        bytes20 targetBytes = bytes20(impl);
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), targetBytes)
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create(0, ptr, 0x37)
        }
        require(instance != address(0), "clone");
    }
}
