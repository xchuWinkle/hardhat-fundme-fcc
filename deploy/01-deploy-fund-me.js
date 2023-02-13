// function deployFunc() {
//   console.log("Hi!");
//   hre.getNamedAccounts();
//   hre.deployments();
// }

// module.exports.default = deployFunc();

const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");
require("dotenv").config();
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  // if chainId is X use address Y
  // if chianId is A use address B
  // when using local host with chain link data feed.
  // We want to us a mocking.
  //const ethUsdPriceFeed = networkConfig[chainId]["ethUsDPriceFeed"];
  let ethUsdPriceFeedAddress;
  if (developmentChains.includes(network.name)) {
    const ethUsdAggregator = await deployments.get("MockV3Aggregator");
    ethUsdPriceFeedAddress = ethUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  }

  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: [ethUsdPriceFeedAddress], //put price Feed address
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  console.log("FundMe Deployed!");
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, [ethUsdPriceFeedAddress]); //constructor arg should always be an array
  }
  console.log("-----------------------------------------");
};

module.exports.tags = ["all", "fundme"];
