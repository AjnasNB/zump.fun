export const PUMP_FACTORY_ABI = [
  'function launchCount() view returns (uint256)',
  'function getLaunch(uint256 id) view returns (tuple(address token, address creator, uint256 basePrice, uint256 slope, uint256 maxSupply, uint256 tokensSold, uint256 reserveBalance, uint64 createdAt))',
  'function launches(uint256) view returns (address token, address creator, uint256 basePrice, uint256 slope, uint256 maxSupply, uint256 tokensSold, uint256 reserveBalance, uint64 createdAt)',
  'function launchIdOf(address token) view returns (uint256)',
  'function currentPrice(uint256 id) view returns (uint256)',
  'function quoteBuy(uint256 id, uint256 amount) view returns (uint256 cost, uint256 fee)',
  'function quoteSell(uint256 id, uint256 amount) view returns (uint256 refund, uint256 fee)',
  'function createLaunch(string name, string symbol, uint256 basePrice, uint256 slope, uint256 maxSupply) returns (uint256 id, address token)',
  'function buy(uint256 id, uint256 amount) payable',
  'function sell(uint256 id, uint256 amount)',
  'function feeBps() view returns (uint16)',
  'function feeReceiver() view returns (address)',
  'function tokenImplementation() view returns (address)',
  'event LaunchCreated(uint256 indexed id, address indexed token, address indexed creator, string name, string symbol, uint256 basePrice, uint256 slope, uint256 maxSupply)',
  'event Buy(uint256 indexed id, address indexed buyer, uint256 tokens, uint256 cost, uint256 fee)',
  'event Sell(uint256 indexed id, address indexed seller, uint256 tokens, uint256 refund, uint256 fee)',
];

export const MEME_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];
