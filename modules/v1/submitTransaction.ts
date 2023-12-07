import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import verifyNetwork from "../verification/verifyNetwork";
import getRpcURL from "../verification/getRpcURL";
import verifyRequestLegitimityOnContract from "../verification/verifyRequestLegitimityOnContract";
import verifyIsAnAddress from "../verification/verifyIsAnAddress";
import { MultisigData } from "../../const/multisig";

const { WALLET_PRIVATE_KEY } = environment;

const contractABI = MultisigData.abi;

export default async function (request: ZuploRequest, context: ZuploContext) {
  var { destination, token, tokenStandard, tokenId, value, data, confirmTimestamp, contractAddress, network } = await request.json();

  // Verify that the request contains a valid network
  const vNetwork = await verifyNetwork(network);
  if (vNetwork != undefined) {
    return vNetwork;
  }

  const verifyRequestLegitimity = verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString(), network);
  if (verifyRequestLegitimity != undefined) {
    return verifyRequestLegitimity;
  }
  const verifyD = verifyIsAnAddress(destination, "destination address");
  if (verifyD != undefined) {
    return verifyD;
  }

  // Verify the transaction parameters
  if (typeof tokenStandard != "number" || tokenStandard < 0 || tokenStandard > 3) {
    return {
      statusCode: 400,
      body: {
        error: "Invalid argument type or format of tokenStandard",
        require: "0 <= tokenStandard <= 3",
        tip: "0 : ERC20, 1 : ERC721, 2 : ERC1155, 3 : ETH or native token of the chain"
      }
    };
  } else if (tokenStandard == 3) {
    tokenId = 0;
    token = "0x0000000000000000000000000000000000000000";
  } else if (tokenStandard == 0) {
    verifyIsAnAddress(token, "token address");
    tokenId = 0;
  } else {
    verifyIsAnAddress(token, "token address");
    if (typeof tokenId != "number" || tokenId < 0) {
      return {
        statusCode: 400,
        body: {
          error: "Invalid argument type or format of tokenId",
          require: "tokenId >= 0",
          tip: "tokenId is the id of the token you want to transfer. If you want to transfer ERC20 set tokenId to 0"
        }
      };
    }
  }

  if (typeof value != "number" || value < 0) {
    return {
      statusCode: 400,
      body: {
        error: "Invalid argument type or format of value",
        require: "number and value >= 0",
      }
    };
  }

  if ((typeof data !== "string" && typeof data !== undefined) && typeof data !== null) {
    return {
      statusCode: 400,
      body: {
        error: "Invalid argument type or format of data",
        require: "data is a string",
        tip: "data is the data you want to send with the transaction. If you don't want to send any data, set data to \"0x\""
      }
    };
  } else if (data == "" || data == null || data == undefined) {
    data = "0x";
  } else if (data.slice(0, 2) != "0x") {
    return {
      statusCode: 400,
      body: {
        error: "Invalid argument type or format of data",
        require: "data is a string",
        tip: "data is the data you want to send with the transaction. If you don't want to send any data, set data to \"0x\""
      }
    };
  }

  if (typeof confirmTimestamp != "number" || confirmTimestamp < 0) {
    return {
      statusCode: 400,
      body: {
        error: "Invalid argument type or format of confirmTimestamp",
        require: "confirmTimestamp >= 0",
        tip: "confirmTimestamp is the timestamp at which the transaction will be no longer confirmable. Set it to 0 to have an infinite confirmTimestamp"
      }
    };
  }

  // set up the transaction
  const rpcUrl = await getRpcURL(network)
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  // send the transaction and the response

  try {
    const transaction = await contract.submitTransactionByOwner(destination, token, tokenStandard, tokenId, value, data, confirmTimestamp);

    /*
    // add the transaction to the database
    const { error } = await supabase.from("transactions").insert([
        {
            transactionId: transaction.transactionId,
            destination: destination,
            token: token,
            ts: ts,
            tokenId: tokenId,
            value: value,
            data: data,
            confirmTimestamp: confirmTimestamp
        }
    ]);

    if (error) {
        console.log(error);
    }
    */

    return {
      statusCode: 200,
      transaction: transaction
    };
  } catch (error) {
    return {
      error: "Transaction reverted",
      errorMessage: error.message,
    };
  }
}