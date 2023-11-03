import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";

const { QUICKNODE_API_KEY, INFURA_API_KEY, SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const RPCurl1 = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';
const RPCurl = 'https://sepolia.infura.io/v3/' + INFURA_API_KEY;
const provider = new ethers.JsonRpcProvider(RPCurl);

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

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
    const { data, error } = await supabase
      .from("contracts")
      .select("creation_hash")
      .eq("creation_hash", txhash);
    if (error) {
      return {
        smallError: "Error while inserting the contract's data in the database",
        error: error,
      };
    }

    if (!data || data.length == 0) {
      return {
        error: "The transaction hash doesn't correspond to a MultiSigWallet deployed with the API"
      }
    }
  } catch (err) {
    return {
      smallError: "Error while inserting the contract's data in the database",
      error: err,
    };
  }

  try {
    const tx = await provider.getTransaction(txhash);
    if (tx == null) {
      return {
        error: "Transaction not mined yet",
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
      const { data, error } = await supabase
        .from("contracts")
        .upsert(
          [
            {
              creation_hash: txhash,
              contract_address: receipt.contractAddress,
            }
          ],
          { onConflict: ["creation_hash"], returning: ["contract_address"] }
        );

      if (error) {
        return {
          smallError: "Error while inserting the contract's data in the database",
          error: error
        };
      }
      return {
        contractAddress: receipt.contractAddress,
      }
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