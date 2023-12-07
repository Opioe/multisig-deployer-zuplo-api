import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
import verifyNetwork from "../verification/verifyNetwork";
import getRpcURL from "../verification/getRpcURL";
import getChainId from "../verification/getChainId";
import { MultisigData } from "../../const/multisig";
import { BeaconProxyData } from "../../const/beaconProxy";
import { proxyAddress } from "../../const/proxyAddress";

const { WALLET_PRIVATE_KEY, SUPABASE_PASSWORD, SUPABASE_URL } = environment;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

const gasCostLimit = 100000000000000000;

export default async function (request: ZuploRequest, context: ZuploContext) {
  /*
  signers : array of Ethereum addresses
  required : number of required signatures
  network : string of the network name (for valid values, see the verifyNetwork, getRpcURL and getChainId functions)
  */
  const { signers, required, network } = await request.json();

  // Verfiy that the request contains a valid signers array
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

  // Verify that the request contains a valid required number
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

  // Verify that the request contains a valid network
  const vNetwork = await verifyNetwork(network);
  if (vNetwork != undefined) {
    return vNetwork;
  }

  // get the rpcUrl and the chainId corresponding to the network
  const rpcUrl = await getRpcURL(network);
  const chainId = await getChainId(network);

  // set up the wallet, the contract factory and the beacon factory
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY as string, provider);
  const contractFactory = new ethers.ContractFactory(MultisigData.abi, MultisigData.bytecode, wallet);
  const beaconFactory = new ethers.ContractFactory(BeaconProxyData.abi, BeaconProxyData.bytecode, wallet);
  const constructorArgs = [signers, required];
  const multisigArgsData = contractFactory.interface.encodeFunctionData("initialize", constructorArgs);
  const beaconProxyData = beaconFactory.interface.encodeDeploy([proxyAddress[chainId], multisigArgsData]);
  const data = ethers.concat([beaconFactory.bytecode, beaconProxyData]);

  // set the nonce, the gasLimit and the gasPrice
  const nonce = await wallet.getNonce();
  const gasLimit = await wallet.estimateGas({
    to: null,
    data: data,
  });
  const feedata = await provider.getFeeData();

  // Verify that the transaction is not too expensive (to modify it : change the value of the gasCostLimit constant)
  if (gasLimit * feedata.gasPrice > gasCostLimit) {
    return {
      statusCode: 503,
      error: "The transaction is too expensive, please use another network or try again later"
    };
  }

  // send the transaction and wait for the confirmation
  const tx = {
    nonce: nonce,
    to: null,
    value: 0,
    gasPrice: feedata.gasPrice.toString(),
    gasLimit: gasLimit.toString(),
    data: data,
    chainId: chainId,
  };
  const sendTxResponse = await wallet.sendTransaction(tx);
  await sendTxResponse.wait();

  // get the contract address and insert it in the database
  const transactionReceipt = await provider.getTransactionReceipt(sendTxResponse.hash);
  const contractAddress = transactionReceipt?.contractAddress;
  try {
    const { error } = await supabase
      .from("contracts")
      .insert([
        { creation_hash: sendTxResponse.hash.toString(), contract_address: contractAddress.toLowerCase(), network: network, chain_id: chainId, owner: request.user.data.customerId.toString() }
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

  // return the response
  if (contractAddress != undefined) {
    return {
      statusCode: 200,
      success: "Transaction sent successfully",
      contractAddress: contractAddress.toLowerCase(),
      sendTxResponse: sendTxResponse.hash,
      network: network,
      chainId: chainId,
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