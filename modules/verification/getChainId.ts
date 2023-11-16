async function getChainId(network) {
    if (network == "matic") {
        return 80001;
    } else if (network == "ethereum") {
        return 11155111;
    } 
}

export default getChainId;