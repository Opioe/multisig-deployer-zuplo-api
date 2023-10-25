const ethers = require("ethers");
import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

const { WALLET_PRIVATE_KEY, QUICKNODE_API_KEY } = process.env;

const RPCurl = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';

export default async function (request: ZuploRequest, context: ZuploContext) {
  console.log("controling the request");

  const bodyreq_signers = await req.body.signers;
  if (typeof bodyreq_signers != "object") {
    res.send({
      error: "Invalid argument type of signers",
    });
    return res.end();
  }
  if (bodyreq_signers.length < 2 || bodyreq_signers.length > 10) {
    res.send({
      error: "Invalid number of signers, expected between 2 and 10",
    });
    return res.end();
  }
  for (let i = 0; i < bodyreq_signers.length; i++) {
    if (typeof bodyreq_signers[i] != "string" || bodyreq_signers[i].length != 42 || bodyreq_signers[i].slice(0, 2) != "0x") {
      res.send({
        error: "Invalid argument type of signers at index " + i + " (current argument at index " + i + " : \'" + bodyreq_signers[i] + "\')",
      });
      return res.end();
    } else {
      for (let j = 2; j < 42; j++) {
        if (bodyreq_signers[i][j] < "0" || bodyreq_signers[i][j] > "9") {
          if (bodyreq_signers[i][j] < "A" || bodyreq_signers[i][j] > "F") {
            if (bodyreq_signers[i][j] < "a" || bodyreq_signers[i][j] > "f") {
              res.send({
                error: "Invalid character at index " + j + " of signers at index " + i + " (current character at index " + j + " : \'" + bodyreq_signers[i][j] + "\')",
              });
              return res.end();
            }
          }
        }
      }
    }
  }

  const bodyreq_required = await req.body.required;
  if (typeof bodyreq_required != "number") {
    res.send({
      error: "Invalid argument type of required",
    });
    return res.end();
  }
  if (bodyreq_required < 1 || bodyreq_required > bodyreq_signers.length) {
    res.send({
      error: "Invalid number of required, expected between 1 and the number of signers (in your request : " + bodyreq_signers.length + " signers)",
    });
    return res.end();
  }

  console.log("preparing the transaction data");

  const provider = new ethers.JsonRpcProvider(RPCurl);
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

  const nonce = await wallet.getNonce();

  const contractArtifact = await hre.artifacts.readArtifact('MultiSigWallet');
  const contractBytecode = contractArtifact.bytecode;
  const contractABI = contractArtifact.abi;

  const contractFactory = new ethers.ContractFactory(contractABI, contractBytecode, wallet);

  const constructorArgs = [bodyreq_signers, bodyreq_required];
  const encodeConstructorArgs = contractFactory.interface.encodeDeploy(constructorArgs);
  const data = contractBytecode + encodeConstructorArgs.slice(2);
  console.log("deploying with transaction data");
  const tx = {
    nonce: nonce,
    to: null,
    value: 0,
    gasPrice: 1860267955,
    gasLimit: 21000000,
    data: data,
    chainId: 80001,
  };
  const sendTxResponse = await wallet.sendTransaction(tx);
  console.log("deployed");
  const network = await provider.getNetwork();
  res.send({
    success: "Transaction sent successfully",
    sendTxResponse: sendTxResponse.hash,
    network: network,
  });
  console.log("API response sent");
  return res.end();
});
