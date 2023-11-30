import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
import verifyNetwork from "../verification/verifyNetwork";
import getRpcURL from "../verification/getRpcURL";
import getChainId from "../verification/getChainId";
import { MultisigData } from "../../const/multisig";
import { BeaconProxyData } from "../../const/beaconProxy";

const { WALLET_PRIVATE_KEY, SUPABASE_PASSWORD, SUPABASE_URL } = environment;

const addresses = {
  1: "0x810664F26F408B698831f5fcdA540a8Bd475Cc0c",
  56: "0xc0ff4C73FfDc597d9aB7EF95a855001715483363",
  43114: "0x17DBEfC6F36E47BA8d478122B953e8A50bFB4908",
  1101: "0x17DBEfC6F36E47BA8d478122B953e8A50bFB4908",
  11155111: "0xa7F10549D73Da73E17DbCe3aa4587b6Bb968C900"
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);


export default async function (request: ZuploRequest, context: ZuploContext) {
  const { signers, required, network } = await request.json();
  console.log(signers)
  if (typeof signers != "object") {
    return {
      statusCode: 400,
      error: "Invalid argument type of signers",
    };
  }
  if (signers.length < 2 || signers.length > 10) {
    return {
      statusCode: 400,
      error: "Invalid number of signers, expected between 2 and 10",
    };
  }

  for (let i = 0; i < signers.length; i++) {
    if (!ethers.isAddress(signers[i])) {
      return {
        error: "Invalid Ethereum address at index " + i + " (current address: \'" + signers[i] + "\')",
      };
    }
  }

  if (typeof required != "number") {
    return {
      statusCode: 400,
      error: "Invalid argument type of required",
    };
  }
  if (required < 1 || required > signers.length) {
    return {
      statusCode: 400,
      error: "Invalid number of required, expected between 1 and the number of signers (in your request : " + signers.length + " signers)",
    };
  }
  await verifyNetwork(network);

  const rpcUrl = await getRpcURL(network);
  const chainId = await getChainId(network);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY as string, provider);

  const contractFactory = new ethers.ContractFactory(MultisigData.abi, MultisigData.bytecode, wallet);
  const beaconFactory = new ethers.ContractFactory(BeaconProxyData.abi, BeaconProxyData.bytecode, wallet);

  const nonce = await wallet.getNonce();

  const constructorArgs = [signers, required];
  const multisigArgsData = contractFactory.interface.encodeFunctionData("initialize", constructorArgs);
  const beaconProxyData = beaconFactory.interface.encodeDeploy([addresses[chainId], multisigArgsData]);
  const data = ethers.concat([beaconFactory.bytecode, beaconProxyData]);

  const tx = {
    nonce: nonce,
    to: null,
    value: 0,
    gasPrice: 2860267955,
    gasLimit: 21000000,
    data: data,
    chainId: chainId,
  };
  const sendTxResponse = await wallet.sendTransaction(tx);
  await sendTxResponse.wait();
  const transactionReceipt = await provider.getTransactionReceipt(sendTxResponse.hash);
  const contractAddress = transactionReceipt?.contractAddress;
  try {
    const { error } = await supabase
      .from("contracts")
      .insert([
        { creation_hash: sendTxResponse.hash.toString(), contract_address: contractAddress, network: network, chain_id: chainId, owner: request.user.data.customerId.toString() }
      ])
    if (error) {
      return {
        statusCode: 503,
        smallError: "Error while inserting the contract's data in the database",
        error: error,
      };
    }
  } catch (err) {
    return {
      statusCode: 503,
      smallError: "Error while inserting the contract's data in the database",
      error: err,
    };
  }

  return {
    statusCode: 200,
    success: "Transaction sent successfully",
    sendTxResponse: sendTxResponse.hash,
    network: network,
    chainId: chainId,
  };
};