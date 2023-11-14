import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
import verifyRequestLegitimityOnContract from "../verification/verifyRequestLegitimityOnContract";
import verifyIsAnAddress from "../verification/verifyIsAnAddress";

const { WALLET_PRIVATE_KEY, QUICKNODE_API_KEY, INFURA_API_KEY, SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const RPCurl1 = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';
const RPCurl = 'https://sepolia.infura.io/v3/' + INFURA_API_KEY;
const provider = new ethers.JsonRpcProvider(RPCurl);

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

const contractABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

export default async function (request: ZuploRequest, context: ZuploContext) {
  const { contractAddress, futureOwner } = await request.body;

  verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString());
  verifyIsAnAddress(futureOwner);

  try {
    const userId = request.user.data.customerId.toString();
    const { data, error } = await supabase
      .from("contracts")
      .select("contract_address")
      .eq("contract_address", contractAddress)
      .eq("owner", userId);

    if (error) {
      return {
        statusCode: 503,
        smallError: "Error while verifying the legitimacy of requesting contract's ownership. Please verify contractAddress",
        error: error,
      };
    }
    if (!data || data.length == 0) {
      return {
        statusCode: 403,
        error: "You are not the person who deployed the contract or this contract is not a MultiSig deploy with the API. You can't request it's ownership"
      }
    }
  } catch (err) {
    return {
      statusCode: 503,
      smallError: "Error while verifying the legitimacy of requesting contract's ownership",
      error: err,
    };
  }

  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  try {
    await contract.owner();
  } catch (error) {
    return {
      statusCode: 400,
      error: "Invalid contract address",
      errorMessage: error.message,
    };
  }

  const verif = await contract.owner();
  if (verif != wallet.address) {
    return {
      statusCode: 403,
      error: "We are not the owner of this contract",
      contractOwner: verif,
    };
  }

  try {
    const tx = await contract.transferOwnership(futureOwner);
    return {
      statusCode: 200,
      tx: tx,
    };
  } catch (error) {
    return {
      error: "Transaction reverted",
      errorMessage: error.message,
    };
  }
};