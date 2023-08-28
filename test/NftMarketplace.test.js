const { assert, expect } = require("chai")
const { developmentChains } = require("../helper-hardhat-config")
const { ethers, network, deployments } = require("hardhat")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarketplace", () => {
          const TOKEN_ID = 0
          const PRICE = ethers.utils.parseEther("0.1")

          let nftMarketplace, deployer, basicNft, user
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]
              //   user1 = accounts.user1
              await deployments.fixture(["all"])
              nftMarketplaceContract = await ethers.getContract("NftMarketplace")
              nftMarketplace = await nftMarketplaceContract.connect(deployer)
              basicNftContract = await ethers.getContract("BasicNft")
              basicNft = await basicNftContract.connect(deployer)
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })
          describe("ListItem", () => {
              it("reverts if price < 0", async () => {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWith("NftMarketplace__PriceMustBEAboveZero()")
              })
              it("Reverts if address not approved", async () => {
                  // we could also create another nft contract to get the address
                  //const helper = await ethers.getContract("HelperContract", deployer)
                  //   await helper.mintNft()
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotApprvedForMarketPlace()")
              })

              it("emits an event when Item is listed and reverts if already listed ", async () => {
                  await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      nftMarketplace,
                      "ItemListed"
                  )
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(`NftMarketplace__AlreadyListed("${basicNft.address}", 0)`)
              })

              it("reverts if not owner ", async () => {
                  const helper = await basicNftContract.connect(user)
                  await helper.mintNft()
                  await expect(
                      nftMarketplace.listItem(basicNft.address, 1, PRICE)
                  ).to.be.revertedWith("NotOwner")
              })
          })
          describe("BuyItem", () => {
              beforeEach(async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              })

              it("reverts if price not met", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith(
                      `NftMarketplace__PriceNotMet("${basicNft.address}", 0, ${PRICE})`
                  )
              })

              it("Updates seller proceeds and delete the Item", async () => {
                  const tx = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  await tx.wait(1)
                  const sellerProceeds = await nftMarketplace.getProceeds(deployer.address)

                  assert.equal(sellerProceeds.toString(), PRICE.toString())
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.be.revertedWith(`NftMarketplace__IsNotListed("${basicNft.address}", 0)`)
              })

              it("emits and event when item bought", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.emit(nftMarketplace, "ItemBought")
              })
          })

          describe("CancelItem", () => {
              beforeEach(async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              })
              it("emits an event when Item canceled", async () => {
                  await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      nftMarketplace,
                      "ItemCanceled"
                  )
              })
          })

          describe("updateListing", () => {
              beforeEach(async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              })

              it("Updates the price", async () => {
                  const newPrice = ethers.utils.parseEther("0.2")
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice)
                  ).to.emit(nftMarketplace, "ItemListed")
              })
          })

          describe("withdrawProceeds", () => {
              it("reverts if no proceeds", async () => {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
                      "NftMarketplace__NoProceeds()"
                  )
              })

              it("withdraws proceeds", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  nftMarketplace = nftMarketplaceContract.connect(deployer)

                  const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
