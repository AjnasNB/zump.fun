import { Account, Contract, RpcProvider, json } from "starknet";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// Network configuration
const NETWORK = process.env.NETWORK || "sepolia";
const RPC_URL = process.env.RPC_URL || `https://starknet-sepolia.public.blastapi.io/rpc/v0_7`;
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ACCOUNT_ADDRESS = process.env.ACCOUNT_ADDRESS || "";

interface DeploymentResult {
  contractName: string;
  address: string;
  txHash: string;
}

async function deployContract(
  provider: RpcProvider,
  account: Account,
  contractName: string,
  constructorCalldata: any[]
): Promise<DeploymentResult> {
  console.log(`\n📦 Deploying ${contractName}...`);

  // Read compiled contract
  const contractPath = path.join(
    __dirname,
    "..",
    "target",
    "dev",
    `${contractName}.sierra.json`
  );

  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract not found at ${contractPath}. Run 'scarb build' first.`);
  }

  const compiledContract = json.parse(
    fs.readFileSync(contractPath).toString("ascii")
  );

  // Read CASM file for class hash
  const casmPath = path.join(
    __dirname,
    "..",
    "target",
    "dev",
    `${contractName}.casm.json`
  );

  if (!fs.existsSync(casmPath)) {
    throw new Error(`CASM file not found at ${casmPath}. Run 'scarb build' first.`);
  }

  const compiledCasm = json.parse(
    fs.readFileSync(casmPath).toString("ascii")
  );

  // Declare the contract class
  console.log(`  Declaring class for ${contractName}...`);
  const declareResponse = await account.declare({
    contract: compiledContract,
    casm: compiledCasm,
  });

  await provider.waitForTransaction(declareResponse.transaction_hash);
  console.log(`  ✅ Class declared: ${declareResponse.class_hash}`);

  // Deploy the contract
  console.log(`  Deploying instance...`);
  const deployResponse = await account.deployContract({
    classHash: declareResponse.class_hash,
    constructorCalldata: constructorCalldata,
  });

  await provider.waitForTransaction(deployResponse.transaction_hash);
  console.log(`  ✅ Contract deployed at: ${deployResponse.contract_address}`);
  console.log(`  📝 Transaction: ${deployResponse.transaction_hash}`);

  return {
    contractName,
    address: deployResponse.contract_address,
    txHash: deployResponse.transaction_hash,
  };
}

async function main() {
  console.log("🚀 Starting Pump.fun Deployment");
  console.log(`📍 Network: ${NETWORK}`);
  console.log(`🔗 RPC: ${RPC_URL}`);

  if (!PRIVATE_KEY || !ACCOUNT_ADDRESS) {
    throw new Error("PRIVATE_KEY and ACCOUNT_ADDRESS must be set in .env");
  }

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY);

  console.log(`👤 Account: ${ACCOUNT_ADDRESS}`);

  const deployments: DeploymentResult[] = [];

  try {
    // 1. Deploy ProtocolConfig
    const protocolOwner = ACCOUNT_ADDRESS; // Use deployer as owner
    const feeBps = 300; // 3%
    const feeReceiver = ACCOUNT_ADDRESS; // Use deployer as fee receiver

    const protocolConfig = await deployContract(
      provider,
      account,
      "ProtocolConfig",
      [protocolOwner, feeBps, feeReceiver]
    );
    deployments.push(protocolConfig);

    // 2. Deploy PumpFactory
    const factoryOwner = ACCOUNT_ADDRESS;
    const pumpFactory = await deployContract(provider, account, "PumpFactory", [
      factoryOwner,
    ]);
    deployments.push(pumpFactory);

    // 3. Deploy LiquidityMigration
    const migrationOwner = ACCOUNT_ADDRESS;
    const liquidityMigration = await deployContract(
      provider,
      account,
      "LiquidityMigration",
      [migrationOwner, pumpFactory.address]
    );
    deployments.push(liquidityMigration);

    // Save deployment addresses
    const deploymentData = {
      network: NETWORK,
      timestamp: new Date().toISOString(),
      account: ACCOUNT_ADDRESS,
      contracts: deployments.reduce((acc, dep) => {
        acc[dep.contractName] = {
          address: dep.address,
          txHash: dep.txHash,
        };
        return acc;
      }, {} as Record<string, { address: string; txHash: string }>),
    };

    const deploymentPath = path.join(__dirname, "..", "deployments", `${NETWORK}.json`);
    const deploymentDir = path.dirname(deploymentPath);
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }

    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log(`\n💾 Deployment data saved to: ${deploymentPath}`);

    console.log("\n✅ Deployment Complete!");
    console.log("\n📋 Deployment Summary:");
    deployments.forEach((dep) => {
      console.log(`  ${dep.contractName}: ${dep.address}`);
    });

    console.log("\n⚠️  Note: MemecoinToken and BondingCurvePool are deployed per-launch.");
    console.log("   Use create_launch.ts script to create new launches.");
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main();

