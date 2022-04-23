import { Contract } from 'ethers';
import { ethers } from 'hardhat';


export async function initStaticATokenProxy(implementationAddress : string, l1tokenProxy : Contract, initArgs : string[]): Promise<Contract> {

    const ABI = ["function initialize(address pool, address aToken, string calldata staticATokenName, string calldata staticATokenSymbol, address l1TokenBridge)"];
    const iface = new ethers.utils.Interface(ABI);
    const l1tokenInitData = iface.encodeFunctionData("initialize", initArgs);
    await l1tokenProxy.initialize(implementationAddress, l1tokenInitData);
    const l1token = await ethers.getContractAt("StaticATokenLMNew", l1tokenProxy.address);
    await l1token.deployed();

    return l1token;
}