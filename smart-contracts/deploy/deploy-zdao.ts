import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ZDAO contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the ZDAO contract
  const ZDAO = await ethers.getContractFactory("ZDAO");
  const zdao = await ZDAO.deploy();
  await zdao.waitForDeployment();

  const contractAddress = await zdao.getAddress();
  console.log("ZDAO deployed to:", contractAddress);

  // Verify deployment
  const deployedContract = await ethers.getContractAt("ZDAO", contractAddress);
  const proposalCount = await deployedContract.proposalCount();
  console.log("Initial proposal count:", proposalCount.toString());

  // Note: Creating proposals requires FHE support
  console.log("Note: Creating proposals requires FHE support and will work on Sepolia testnet");
  console.log("To create proposals, deploy to Sepolia testnet using: npm run deploy:sepolia");

  console.log("Deployment completed successfully!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Use Zama Relayer SDK to encrypt votes on the frontend");
  console.log("2. Call vote() function with encrypted vote and proof");
  console.log("3. Use makeVoteCountsPublic() to reveal results");
  console.log("4. Decrypt results using Zama Relayer SDK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
