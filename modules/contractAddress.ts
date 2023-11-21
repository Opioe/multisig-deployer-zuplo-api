import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
import verifyNetwork from "./verification/verifyNetwork";
import getRpcURL from "./verification/getRpcURL";

const { SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

export default async function (request: ZuploRequest, context: ZuploContext) {
  const txhash = await request.query.txhash
  if (typeof txhash != "string" || txhash.length != 66 || txhash.slice(0, 2) != "0x") {
    return {
      statusCode: 400,
      error: "Invalid argument type or format of txhash",
    };
  } else {
    for (let i = 2; i < 66; i++) {
      if (txhash[i] < "0" || txhash[i] > "9") {
        if (txhash[i] < "A" || txhash[i] > "F") {
          if (txhash[i] < "a" || txhash[i] > "f") {
            return {
              statusCode: 400,
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
        statusCode: 503,
        smallError: "Error while inserting the contract's data in the database",
        error: error,
      };
    }

    if (!data || data.length == 0) {
      return {
        statusCode: 404,
        error: "The transaction hash doesn't correspond to a MultiSigWallet deployed with the API"
      }
    }
  } catch (err) {
    return {
      statusCode: 503,
      smallError: "Error while inserting the contract's data in the database",
      error: err,
    };
  }

  const network = await request.query.network
  await verifyNetwork(network);
  const rpcUrl = await getRpcURL(network)
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    const tx = await provider.getTransaction(txhash);
    if (tx == null) {
      return {
        statusCode: 404,
        error: "Transaction not mined yet",
      };
    }
  } catch (error) {
    return {
      statusCode: 400,
      error: "Invalid txhash",
      errorMessage: error.message,
    };
  }

  try {
    const receipt = await provider.getTransactionReceipt(txhash);

    if (receipt.contractAddress) {
      const { error } = await supabase
        .from("contracts")
        .upsert(
          [
            {
              creation_hash: txhash,
              contract_address: receipt.contractAddress,
            }
          ],
        );

      if (error) {
        return {
          statusCode: 503,
          smallError: "Error while inserting the contract's data in the database",
          error: error
        };
      }
      return {
        statusCode: 200,
        contractAddress: receipt.contractAddress,
      }
    } else {
      return {
        statusCode: 404,
        error: "No contract address found for this transaction, please verify that the transaction corresponds to a contract deployment",
      };
    }
  } catch (error) {
    return {
      statusCode: 404,
      error: "Transaction not found or not mined yet",
      errorMessage: error.message,
    };
  }
};