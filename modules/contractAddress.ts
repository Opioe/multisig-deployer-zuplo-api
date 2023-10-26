import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

const QUICKNODE_API_KEY = environment.QUICKNODE_API_KEY;
const INFURA_API_KEY = environment.INFURA_API_KEY;

const RPCurl1 = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';
const RPCurl = 'https://sepolia.infura.io/v3/' + INFURA_API_KEY;
const provider = new ethers.JsonRpcProvider(RPCurl);

export default async function (request: ZuploRequest, context: ZuploContext) {
  const txhash = await request.query.txhash
  if (typeof txhash != "string" || txhash.length != 66 || txhash.slice(0, 2) != "0x") {
    return {
      error: "Invalid argument type or format of txhash",
    };
  } else {
    for (let i = 2; i < 66; i++) {
      if (txhash[i] < "0" || txhash[i] > "9") {
        if (txhash[i] < "A" || txhash[i] > "F") {
          if (txhash[i] < "a" || txhash[i] > "f") {
            return {
              error: "Invalid character at index " + i + " of txhash (current character at index " + i + " : \'" + txhash[i] + "\')",
            };
          }
        }
      }
    }
  }

  try {
    const tx = await provider.getTransaction(txhash);
    if (tx == null) {
      return {
        error: "Transaction not found or not mined yet",
      };
    }
  } catch (error) {
    return {
      error: "Invalid txhash",
      errorMessage: error.message,
    };
  }

  try {
    const receipt = await provider.getTransactionReceipt(txhash);

    if (receipt.contractAddress) {
      return {
        contractAddress: receipt.contractAddress,
      };
    } else {
      return {
        error: "No contract address found for this transaction, please verify that the transaction corresponds to a contract deployment",
      };
    }
  } catch (error) {
    return {
      error: "Transaction not found or not mined yet",
      errorMessage: error.message,
    };
  }
};