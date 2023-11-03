import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_PASSWORD } = environment;

const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_PASSWORD || ""
);

export default async function (request: ZuploRequest, context: ZuploContext) {
  const { error } = await supabase
    .from("contracts")
    .insert([
      { creation_hash: "sendTxResponse.hash3", network: "network.name", chain_id: 1, owner: request.user.data.customerId },
    ])
  if (error) {
    return {
      smallError: "Error while inserting the contract's data in the database",
      error: error
    };
  }
}