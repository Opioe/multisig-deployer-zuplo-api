import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
const verifyRequestLegitimityOnContract = require("./verification/verifyRequestLegitimityOnContract");
const verifyIsAnAddress = require("./verification/verifyIsAnAddress");

const { WALLET_PRIVATE_KEY, QUICKNODE_API_KEY, INFURA_API_KEY, SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const RPCurl1 = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';
const RPCurl = 'https://sepolia.infura.io/v3/' + INFURA_API_KEY;

const provider = new ethers.JsonRpcProvider(RPCurl);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

const supabase = createClient(
    SUPABASE_URL || "",
    SUPABASE_PASSWORD || ""
  );

const contractABI = [
    {
        "inputs": [
          {
            "internalType": "address payable",
            "name": "destination",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "enum MultiSigWallet.TokenStandard",
            "name": "ts",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "confirmTimestamp",
            "type": "uint256"
          }
        ],
        "name": "submitTransactionByOwner",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "transactionId",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
  ];

export default async function (request: ZuploRequest, context: ZuploContext) {
    var { destination, token, tokenStandard, tokenId, value, data, confirmTimestamp, contractAddress } = request.body;

    verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString());
    verifyIsAnAddress(destination, "destination address");

    if (typeof tokenStandard != "number" || tokenStandard < 0 || tokenStandard > 3) {
        return {
            statusCode: 400,
            body: {
                error: "Invalid argument type or format of tokenStandard",
                require : "0 <= tokenStandard <= 3",
                tip : "0 : ERC20, 1 : ERC721, 2 : ERC1155, 3 : ETH or native token of the chain"
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
                    require : "tokenId >= 0",
                    tip : "tokenId is the id of the token you want to transfer. If you want to transfer ERC20 set tokenId to 0"
                }
            };
        }
    }
    
    if (typeof value != "number" || value < 0) {
        return {
            statusCode: 400,
            body: {
                error: "Invalid argument type or format of value",
                require : "number and value >= 0",
            }
        };
    }
    if (typeof data !== "string" || typeof data !== undefined || typeof data !== null) {
        return {
            statusCode: 400,
            body: {
                error: "Invalid argument type or format of data",
                require : "data is a string",
                tip : "data is the data you want to send with the transaction. If you don't want to send any data, set data to \"0x\""
            }
        };
    } else if (data == "" || data == null || data == undefined) {
        data = "0x";
    } else if (data.slice(0, 2) != "0x") {
        return {
            statusCode: 400,
            body: {
                error: "Invalid argument type or format of data",
                require : "data is a string",
                tip : "data is the data you want to send with the transaction. If you don't want to send any data, set data to \"0x\""
            }
        };
    }

    if (typeof confirmTimestamp != "number" || confirmTimestamp < 0) {
        return {
            statusCode: 400,
            body: {
                error: "Invalid argument type or format of confirmTimestamp",
                require : "confirmTimestamp >= 0",
                tip : "confirmTimestamp is the timestamp at which the transaction will be no longer confirmable. Set it to 0 to have an infinite confirmTimestamp"
            }
        };
    }

    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    const transaction = await contract.submitTransactionByOwner(destination, token, tokenStandard, tokenId, value, data, confirmTimestamp);

    /*
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
}