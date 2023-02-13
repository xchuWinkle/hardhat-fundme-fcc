const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1");
      beforeEach(async function () {
        // deploy our fundMe contract
        // const accounts = await ethers.getSigners()
        //deployer = (await getNamedAccounts()).deployer;
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe");
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator");
      });
      describe("constructor", async function () {
        it("should sets the aggregator addresses correctoy", async function () {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("should fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("update the funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          //const mockDeployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });
        it("should add funder to array of s_funders", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunders(0);
          assert.equal(funder, deployer);
        });
      });
      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("withdraw ETH from a single funder", async function () {
          //Arrange
          // starting balance of the contract after deployment and sending 1 ETH
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address // can also use ethers.provider.getBalance
          );
          // starting balance of the deployer after deployment and sending 1 ETH
          const startingDeployBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          // Ending balance of contract after withdrawl. Should be zero
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          // Ending balance of deployer after withdrawl.
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Assert
          assert.equal(endingFundMeBalance, 0);
          // starting deployer balance + starting contract balance(withdraw amount) - gascost
          // == ending balance of deployer
          assert.equal(
            startingFundMeBalance.add(startingDeployBalance),
            endingDeployerBalance.add(gasCost).toString()
          );
        });
        it("should allows us to withdraw with multiple s_funders", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance),
            endingDeployerBalance.add(gasCost).toString()
          );

          // Also make sure that the s_funders are reset properly
          await expect(fundMe.getFunders(0)).to.be.reverted;

          // Making sure all remaining balance are zero
          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("should only allow owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(attackerConnectedContract.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          );
        });

        it("withdraw ETH from a single funder, cheaper withdraw", async function () {
          //Arrange
          // starting balance of the contract after deployment and sending 1 ETH
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address // can also use ethers.provider.getBalance
          );
          // starting balance of the deployer after deployment and sending 1 ETH
          const startingDeployBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          // Ending balance of contract after withdrawl. Should be zero
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          // Ending balance of deployer after withdrawl.
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Assert
          assert.equal(endingFundMeBalance, 0);
          // starting deployer balance + starting contract balance(withdraw amount) - gascost
          // == ending balance of deployer
          assert.equal(
            startingFundMeBalance.add(startingDeployBalance),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        it("cheaper withdraw testing", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance),
            endingDeployerBalance.add(gasCost).toString()
          );

          // Also make sure that the s_funders are reset properly
          await expect(fundMe.getFunders(0)).to.be.reverted;

          // Making sure all remaining balance are zero
          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
        it("should only allow owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(
            attackerConnectedContract.cheaperWithdraw()
          ).to.be.revertedWith("FundMe__NotOwner");
        });
      });
    });
