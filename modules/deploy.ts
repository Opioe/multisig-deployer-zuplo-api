import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import multisigJson from '../contract/MultiSigWallet.json';
import beaconProxyJson from '../contract/BeaconProxy.json';
import addresses from '../const/address.json';
const { WALLET_PRIVATE_KEY, QUICKNODE_API_KEY, INFURA_API_KEY } = environment;
console.log(WALLET_PRIVATE_KEY)
const RPCurl1 = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';
const RPCurl = 'https://sepolia.infura.io/v3/' + INFURA_API_KEY;

const provider = new ethers.JsonRpcProvider(RPCurl);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY as string, provider);

const contractFactory = new ethers.ContractFactory(multisigJson.abi, multisigJson.bytecode, wallet);
const beaconFactory = new ethers.ContractFactory(beaconProxyJson.abi, beaconProxyJson.bytecode, wallet);

export default async function (request: ZuploRequest, context: ZuploContext) {
  console.log("controling the request");
  const req = await request.json()
  const chainId = await req.chainId;
  const bodyreq_signers = await req.signers;
  if (typeof bodyreq_signers != "object") {
    return {
      error: "Invalid argument type of signers",
    };
  }
  if (bodyreq_signers.length < 2 || bodyreq_signers.length > 10) {
    return {
      error: "Invalid number of signers, expected between 2 and 10",
    };
  }

  for (let i = 0; i < bodyreq_signers.length; i++) {
    if (!ethers.isAddress(bodyreq_signers[i])) {
      return {
        error: "Invalid Ethereum address at index " + i + " (current address: \'" + bodyreq_signers[i] + "\')",
      };
    }
  }


  const bodyreq_required = await req.required;
  if (typeof bodyreq_required != "number") {
    return {
      error: "Invalid argument type of required",
    };
  }
  if (bodyreq_required < 1 || bodyreq_required > bodyreq_signers.length) {
    return {
      error: "Invalid number of required, expected between 1 and the number of signers (in your request : " + bodyreq_signers.length + " signers)",
    };
  }

  console.log("preparing the transaction data");

  const nonce = await wallet.getNonce();

  const constructorArgs = [bodyreq_signers, bodyreq_required];
  const multisigArgsData = contractFactory.interface.encodeFunctionData("initialize", constructorArgs);
  const beaconProxyData = beaconFactory.interface.encodeDeploy([addresses[chainId], multisigArgsData]);
  const data = ethers.concat([beaconFactory.bytecode, beaconProxyData]);
  console.log("deploying with transaction data");
  const tx = {
    nonce: nonce,
    to: null,
    value: 0,
    gasPrice: 3060267955,
    gasLimit: 21000000,
    data: data,
    chainId: +chainId,
  };
  const sendTxResponse = await wallet.sendTransaction(tx);
  console.log("deployed");
  const network = await provider.getNetwork();
  console.log("API response sent");
  return {
    success: "Transaction sent successfully",
    sendTxResponse: sendTxResponse.hash,
    network: network,
  };
};