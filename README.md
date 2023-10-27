# How to use the API

Video Tutorial : https://youtu.be/edwToJNvyi0

The URL : **<https://multisig-deployer-zuplo-api-main-5665f32.d2.zuplo.dev>**

### Set the header

"Authorization" : "Bearer ${authentification token}"
example : "Authorization": "Bearer zpka_ad...17"

## Routes

#### POST /deploy

In the body :

* "signers": list of string, the signers
* "required": int, required number of signatures to validate a transaction

example :

```
{
 "signers" : ["0x0c49DF4e21909375c220D2Fe6661b32481aCc258", "0xdDe7b5B326DE06f01b2aCf08cF38573e74ef5d68"],
 "required" : 1
}
```

#### GET /contractAddress

/contractAddress?txhash=${hash de la transaction de deployment}
example :

```
/contractAddress?txhash=0x5c812ec6614021ab4217393c31987f4d6cd6e1a9267a5a13863b6221a0941d8d
```

#### POST /resquestSignerChange

In the body :

* "contractAddress": string (address), address of the contract
* "oldSigner": string (address), address of the signer who will be replaced
* "newSigner": string (address), address of the future signer

example :

```
{
 "contractAddress": "0x3B42729F88697fceb79647d582550FE1b52eF866",
 "oldSigner": "0x0c49DF4e21909375c220D2Fe6661b32481aCc258",
 "newSigner": "0x07128963Cafd50de0E338b3234ECe7C6D4F100D5"
}
```

#### POST /resquestOwnership

In the body :

* "futureOwner": string (address), address of the future owner
* "contractAddress": string (address), address of the contract

example :

```
{
 "futureOwner" : "0x31236F42F4d3c052cc4720Da7CFFc74C9A1dA2B0",
 "contractAddress" : "0x3B42729F88697fceb79647d582550FE1b52eF866"
}
```
