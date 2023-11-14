import { environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

async function _verifyRequestLegitimityOnContract(contractAddress, userId) {
    if (typeof contractAddress != "string" || contractAddress.length != 42 || contractAddress.slice(0, 2) != "0x") {
    return {
        error: "Invalid argument type or format of contractAddress",
    };
    } else {
    for (let i = 2; i < 42; i++) {
        if (contractAddress[i] < "0" || contractAddress[i] > "9") {
        if (contractAddress[i] < "A" || contractAddress[i] > "F") {
            if (contractAddress[i] < "a" || contractAddress[i] > "f") {
            return {
                error: "Invalid character at index " + i + " of contractAddress (current character at index " + i + " : \'" + contractAddress[i] + "\')",
            };
            }
        }
        }
    }
    }

    try {
    const { data, error } = await supabase
        .from("contracts")
        .select("contract_address")
        .eq("contract_address", contractAddress)
        .eq("owner", userId);

    if (error) {
        return {
        smallError: "Error while verifying the legitimacy of requesting contract's ownership. Please verify contractAddress",
        error: error,
        };
    }
    if (!data || data.length == 0) {
        return {
        error: "You are not the person who deployed the contract. You can't request it's ownership"
        }
    }
    } catch (err) {
    return {
        smallError: "Error while verifying the legitimacy of requesting contract's ownership",
        error: err,
    };
    }
}

// export la function main
export default _verifyRequestLegitimityOnContract;