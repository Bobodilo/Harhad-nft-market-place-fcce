const { network, ethers } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const TOKEN_ID = 0

const buyItem = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    const Listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
    const price = await Listing.price.toString()
    const tx = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: price })
    await tx.wait(1)

    if (network.config.chainId == "31337") {
        await moveBlocks(1, (sleepAmount = 100))
    }
    console.log("Item bought!")
}

buyItem()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
