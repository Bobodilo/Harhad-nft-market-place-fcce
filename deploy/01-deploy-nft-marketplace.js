const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const args = []
    log("__________________________________")
    const nftmarketplace = await deploy("NftMarketplace", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("verifying...")
        await verify(nftmarketplace.address, args)
    }

    log("__________________________________")
}

module.exports.tags = ["all", "nftmarketplace", "main"]
