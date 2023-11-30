import { ethers } from "ethers";
import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";
import verifyNetwork from "../verification/verifyNetwork";
import getRpcURL from "../verification/getRpcURL";

const { SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PASSWORD
);

export default async function (request: ZuploRequest, context: ZuploContext) {
  try {
    const { data, error } = await supabase
      .from("contracts").select();
    if (error) {
      return {
        statusCode: 503,
        smallError: "Error while inserting the contract's data in the database",
        error: error,
      };
    }

    if (!data || data.length == 0) {
      return {
        statusCode: 404,
        error: "The transaction hash doesn't correspond to a MultiSigWallet deployed with the API"
      }
    }
    return data;
  } catch (err) {
    return {
      statusCode: 503,
      smallError: "Error while inserting the contract's data in the database",
      error: err,
    };
  }
};