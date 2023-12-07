import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
import verifyRequestLegitimityOnContract from "../verification/verifyRequestLegitimityOnContract";
import verifyIsAnAddress from "../verification/verifyIsAnAddress";
import verifyNetwork from "../verification/verifyNetwork";
import getRpcURL from "../verification/getRpcURL";
import { MultisigData } from "../../const/multisig";

const { WALLET_PRIVATE_KEY, SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

const contractABI = MultisigData.abi;

export default async function (request: ZuploRequest, context: ZuploContext) {
  /*
  contractAddress : address of the contract
  oldSigner : address of the signer to remove
  newSigner : address of the signer to add
  network : string of the network name (for valid values, see the verifyNetwork and getRpcURL functions)
  */
  const { contractAddress, oldSigner, newSigner, network } = await request.json();

  // Verify that the request contains a valid network
  const vNetwork = await verifyNetwork(network);
  if (vNetwork != true) {
    return vNetwork;
  }

  // Verify that the request legimitity
  const verifyRequestLegitimity = await verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString(), network);
  if (verifyRequestLegitimity != true) {
    return verifyRequestLegitimity;
  }

  // set up the transaction
  const rpcUrl = await getRpcURL(network)
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  // Verify we still are the owner of the contract
  if (await contract.owner() != wallet.address) {
    return {
      statusCode: 400,
      error: "We are not the owner of the smart-contract at the address " + contractAddress + "."
    };
  }

  // Verify the old signer ans new signer parameters
  const verifyO = await verifyIsAnAddress(oldSigner);
  if (verifyO != true) {
    return verifyO;
  }
  if (oldSigner == newSigner) {
    return {
      statusCode: 400,
      error: "Old signer and new signer must be different",
    };
  }
  const verifyN = await verifyIsAnAddress(newSigner);
  if (verifyN != true) {
    return verifyN;
  }
  if (await contract.isSigner(newSigner)) {
    return {
      statusCode: 400,
      error: "The address " + newSigner + " is already a signer of the smart-contract at the address " + contractAddress,
    };
  }

  // send the transaction and the response
  try {
    const tx = await contract.requestSignerChange(oldSigner, newSigner);
    return {
      statusCode: 200,
      tx: tx,
    };
  } catch (error) {
    return {
      error: "Transaction reverted",
      errorMessage: error.message,
    };
  }
}