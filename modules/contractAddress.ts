const ethers = require("ethers");
import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

const { WALLET_PRIVATE_KEY, QUICKNODE_API_KEY } = process.env;

const RPCurl = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';

export default async function (request: ZuploRequest, context: ZuploContext) {
  const txhash = await req.body.txhash;
  if (typeof txhash != "string" || txhash.length != 66 || txhash.slice(0, 2) != "0x") {
    res.send({
      error: "Invalid argument type or format of txhash",
    });
    return res.end();
  } else {
    for (let i = 2; i < 66; i++) {
      if (txhash[i] < "0" || txhash[i] > "9") {
        if (txhash[i] < "A" || txhash[i] > "F") {
          if (txhash[i] < "a" || txhash[i] > "f") {
            res.send({
              error: "Invalid character at index " + i + " of txhash (current character at index " + i + " : \'" + txhash[i] + "\')",
            });
            return res.end();
          }
        }
      }
    }
  }

  const provider = new ethers.JsonRpcProvider(RPCurl);

  try {
    const tx = await provider.getTransaction(txhash);
    if (tx == null) {
      res.send({
        error: "Transaction not found or not mined yet",
      });
      return res.end();
    }
  } catch (error) {
    res.send({
      error: "Invalid txhash",
      errorMessage: error.message,
    });
    return res.end();
  }

  try {
    const receipt = await provider.getTransactionReceipt(txhash);

    if (receipt.contractAddress) {
      res.send({
        contractAddress: receipt.contractAddress,
      });
      return res.end();
    } else {
      res.send({
        error: "No contract address found for this transaction, please verify that the transaction corresponds to a contract deployment",
      });
      return res.end();
    }
  } catch (error) {
    res.send({
      error: "Transaction not found or not mined yet",
      errorMessage: error.message,
    });
    return res.end();
  }
});