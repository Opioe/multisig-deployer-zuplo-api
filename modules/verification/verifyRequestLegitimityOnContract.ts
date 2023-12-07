import { environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

async function verifyRequestLegitimityOnContract(contractAddress, userId, network) {
  if (typeof contractAddress != "string" || contractAddress.length != 42 || contractAddress.slice(0, 2) != "0x") {
    return {
      error: "Invalid argument type or format of contractAddress",
    };
  } else {
    contractAddress = contractAddress.toLowerCase();
    for (let i = 2; i < 42; i++) {
      if (contractAddress[i] < "0" || contractAddress[i] > "9") {
        if (contractAddress[i] < "a" || contractAddress[i] > "f") {
          return {
            error: "Invalid character at index " + i + " of contractAddress (current character at index " + i + " : \'" + contractAddress[i] + "\')",
          };
        }
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("contract_address")
      .eq("contract_address", contractAddress)
      .eq("owner", userId)
      .eq("network", network);

    if (error) {
      return {
        smallError: "Error while verifying the legitimacy of requesting contract's ownership. Please verify contractAddress",
        error: error,
      };
    }
    if (!data || data.length == 0) {
      return {
        error: "You are not the person who deployed the contract. You can't request it's ownership, or the contract doesn't exist",
        hint: "If you are the owner of the contract, please verify the contractAddress and the network",
      }
    }
  } catch (err) {
    return {
      smallError: "Error while verifying the legitimacy of requesting contract's ownership",
      error: err,
    };
  }

  return true;
}

export default verifyRequestLegitimityOnContract;