import { environment } from "@zuplo/runtime";

const { QUICKNODE_API_KEY, INFURA_API_KEY } = environment;

const RPCurlMatic = 'https://attentive-convincing-pallet.matic-testnet.quiknode.pro/' + QUICKNODE_API_KEY + '/';
const RPCurlETH = 'https://sepolia.infura.io/v3/' + INFURA_API_KEY;

async function getRpcURL(network) {
    if (network == "matic") {
        return RPCurlMatic;
    } else if (network == "ethereum") {
        return RPCurlETH;
    } 
}

export default getRpcURL;