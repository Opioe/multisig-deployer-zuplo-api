async function verifyNetwork(network) {
    if (typeof network != "string") {
        return {
            statusCode: 400,
            error: "Invalid argument type of network",
            requiredType: "string",
        };
    }

    if (network !== "matic" && network !== "ethereum") {
        return {
            statusCode: 400,
            error: "Invalid network",
            requiredNetworks: ["ethereum", "matic"],
        };
    }
}

export default verifyNetwork;