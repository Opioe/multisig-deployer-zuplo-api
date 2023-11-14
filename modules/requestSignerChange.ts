import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
import verifyRequestLegitimityOnContract from "./verification/verifyRequestLegitimityOnContract";
import verifyIsAnAddress from "./verification/verifyIsAnAddress";

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
        "name": "_oldSigner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_newSigner",
        "type": "address"
      }
    ],
    "name": "requestSignerChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

export default async function (request: ZuploRequest, context: ZuploContext) {
  const { contractAddress, oldSigner, newSigner } = await request.body;

  verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString());

  const contract = new ethers.Contract(contractAddress, contractABI, wallet);
  try {
    await contract.owner();
  } catch (error) {
    return {
      statusCode: 400,
      error: "The address " + contractAddress + " does not correspond to a MultiSigWallet smart-contract",
      errorMessage: error.message,
    };
  }
  if (await contract.owner() != wallet.address) {
    return {
      statusCode: 400,
      error: "We are not the owner of the smart-contract at the address " + contractAddress + ". Or the smart-contract is not a MultiSigWallet."
    };
  }

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
        error: "You are not the person who deployed the contract. You can't request a signer change"
      }
    }
  } catch (err) {
    return {
      statusCode: 503,
      smallError: "Error while verifying the legitimacy of requesting contract's ownership",
      error: err,
    };
  }

  verifyIsAnAddress(oldSigner);
  if (oldSigner == newSigner) {
    return {
      statusCode: 400,
      error: "Old signer and new signer must be different",
    };
  }
  verifyIsAnAddress(newSigner);

  if (await contract.isSigner(newSigner)) {
    return {
      statusCode: 400,
      error: "The address " + newSigner + " is already a signer of the smart-contract at the address " + contractAddress,
    };
  }

  try {
    const tx = await contract.requestSignerChange(oldSigner, newSigner);
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
}