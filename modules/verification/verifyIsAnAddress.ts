async function verifyIsAnAddress(address, errorName = "address") {
    if (typeof address != "string" || address.length != 42 || address.slice(0, 2) != "0x") {
      return {
        error: "Invalid argument type or format of " + errorName,
      };
    } else {
      for (let i = 2; i < 42; i++) {
        if (address[i] < "0" || address[i] > "9") {
          if (address[i] < "A" || address[i] > "F") {
            if (address[i] < "a" || address[i] > "f") {
              return {
                error: "Invalid character at index " + i + " of " + errorName +" (current character at index " + i + " : \'" + address[i] + "\')",
              };
            }
          }
        }
      }
    }
}

export default verifyIsAnAddress;