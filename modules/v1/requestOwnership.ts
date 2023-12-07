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
  const { contractAddress, futureOwner, network } = await request.json();

  verifyRequestLegitimityOnContract(contractAddress, request.user.data.customerId.toString());
  verifyIsAnAddress(futureOwner);

  try {
    const userId = request.user.data.customerId.toString();
    const { data, error } = await supabase
      .from("contracts")
      .select("contract_address")
      .eq("contract_address", contractAddress)
      .eq("owner", userId);

    if (error) {
      return {
        statusCode: 503,
        smallError: "Error while verifying the legitimacy of requesting contract's ownership. Please verify contractAddress",
        error: error,
      };
    }
    if (!data || data.length == 0) {
      return {
        statusCode: 403,
        error: "You are not the person who deployed the contract or this contract is not a MultiSig deploy with the API. You can't request it's ownership"
      }
    }
  } catch (err) {
    return {
      statusCode: 503,
      smallError: "Error while verifying the legitimacy of requesting contract's ownership",
      error: err,
    };
  }

  const vNetwork = await verifyNetwork(network);
  if (vNetwork != undefined) {
    return vNetwork;
  }
  const rpcUrl = await getRpcURL(network)
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  try {
    await contract.owner();
  } catch (error) {
    return {
      statusCode: 400,
      error: "Invalid contract address",
      errorMessage: error.message,
    };
  }

  const verif = await contract.owner();
  if (verif != wallet.address) {
    return {
      statusCode: 403,
      error: "We are not the owner of this contract",
      contractOwner: verif,
    };
  }

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