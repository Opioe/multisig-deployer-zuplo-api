const ethers = require("ethers");
import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

const { WALLET_PRIVATE_KEY, QUICKNODE_API_KEY } = process.env;

const RPCurl = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';

export default async function (request: ZuploRequest, context: ZuploContext) {
  const futureOwner = await req.body.futureOwner;
  if (typeof futureOwner != "string" || futureOwner.length != 42 || futureOwner.slice(0, 2) != "0x") {
    res.send({
      error: "Invalid argument type or format of futureOwner",
    });
    return res.end();
  } else {
    for (let i = 2; i < 42; i++) {
      if (futureOwner[i] < "0" || futureOwner[i] > "9") {
        if (futureOwner[i] < "A" || futureOwner[i] > "F") {
          if (futureOwner[i] < "a" || futureOwner[i] > "f") {
            res.send({
              error: "Invalid character at index " + i + " of futureOwner (current character at index " + i + " : \'" + futureOwner[i] + "\')",
            });
            return res.end();
          }
        }
      }
    }
  }

  const contractAddress = await req.body.contractAddress;
  if (typeof contractAddress != "string" || contractAddress.length != 42 || contractAddress.slice(0, 2) != "0x") {
    res.send({
      error: "Invalid argument type or format of contractAddress",
    });
    return res.end();
  } else {
    for (let i = 2; i < 42; i++) {
      if (contractAddress[i] < "0" || contractAddress[i] > "9") {
        if (contractAddress[i] < "A" || contractAddress[i] > "F") {
          if (contractAddress[i] < "a" || contractAddress[i] > "f") {
            res.send({
              error: "Invalid character at index " + i + " of contractAddress (current character at index " + i + " : \'" + contractAddress[i] + "\')",
            });
            return res.end();
          }
        }
      }
    }
  }

  const provider = new ethers.JsonRpcProvider(RPCurl);

  const contractArtifact = await hre.artifacts.readArtifact('MultiSigWallet');
  const contractABI = contractArtifact.abi;

  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  try {
    await contract.owner();
  } catch (error) {
    res.send({
      error: "Invalid contract address",
      errorMessage: error.message,
    });
    return res.end();
  }

  const verif = await contract.owner();
  if (verif != wallet.address) {
    res.send({
      error: "We are not the owner of this contract",
      contractOwner: verif,
    });
    return res.end();
  }

  try {
    const tx = await contract.transferOwnership(futureOwner);
    res.send({
      tx: tx,
    });
    return res.end();
  } catch (error) {
    res.send({
      error: "Transaction reverted",
      errorMessage: error.message,
    });
    return res.end();
  }
});