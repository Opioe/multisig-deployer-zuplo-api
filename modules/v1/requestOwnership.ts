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
  futureOwner : address of the future owner
  network : string of the network name (for valid values, see the verifyNetwork and getRpcURL functions)
  */
  const { contractAddress, futureOwner, network } = await request.json();

  // Verify that the request contains a valid network
  const vNetwork = await verifyNetwork(network);
  if (vNetwork != undefined) {
    return vNetwork;
  }

  // Verify that the request legimitity
  const verifyRequestLegitimity = verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString(), network);
  if (verifyRequestLegitimity != undefined) {
    return verifyRequestLegitimity;
  }
  verifyIsAnAddress(futureOwner);

  // set up the transaction
  const rpcUrl = await getRpcURL(network)
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  // Verify we still are the owner of the contract
  const verif = await contract.owner();
  if (verif != wallet.address) {
    return {
      statusCode: 403,
      error: "We are not the owner of this contract",
      contractOwner: verif,
    };
  }

  // send the transaction and the response
  try {
    const tx = await contract.transferOwnership(futureOwner);
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
};