import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import verifyRequestLegitimityOnContract from "../verification/verifyRequestLegitimityOnContract";

const { QUICKNODE_API_KEY, INFURA_API_KEY } = environment;

const RPCurl1 = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';
const RPCurl = 'https://sepolia.infura.io/v3/' + INFURA_API_KEY;
const provider = new ethers.JsonRpcProvider(RPCurl);

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
    const { contractAddress } = request.body;
    verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString());

    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    const transaction = await contract.claimOwnerChange();

    return {
        statusCode: 400,
        transaction: transaction
    }
}