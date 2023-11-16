import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import verifyRequestLegitimityOnContract from "./verification/verifyRequestLegitimityOnContract";
import verifyNetwork from "./verification/verifyNetwork";
import getRpcURL from "./verification/getRpcURL";

const { WALLET_PRIVATE_KEY } = environment;

const contractABI = [
    {
        "inputs": [],
        "name": "claimOwnerChange",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
  ];

export default async function (request: ZuploRequest, context: ZuploContext) {
    const { contractAddress, network } = request.query.contractAddress;
    verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString());

    await verifyNetwork(network);
    const rpcUrl = await getRpcURL(network)
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    const transaction = await contract.claimOwnerChange();

    return {
        statusCode: 400,
        transaction: transaction
    }
}