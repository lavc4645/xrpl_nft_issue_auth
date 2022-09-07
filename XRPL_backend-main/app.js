import { create } from "ipfs-http-client";
import axios from "axios";
import { Server, Socket } from "socket.io";
import http from "http";

import fs from "fs";
import express from "express";
import upload from "express-fileupload";
import cors from "cors";
import { XummSdk } from "xumm-sdk";
import path from "path";
import xrpl from "xrpl";
import * as dotenv from "dotenv";
dotenv.config();

const __dirname = path.resolve(path.dirname(""));
const app = express();
app.use(cors());
app.use(upload());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/./index.html");
});
const user_token = { token: null, istoken: false };
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
var cont = "";
io.on("connection", (socket) => {
  console.log("socket is connected");
  cont = socket;

  cont.on("get_nft_list", async (walletaddress) => {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");

    await client.connect();

    const nfts = await client.request({
      method: "account_nfts",
      account: walletaddress,
    });

    const total_nft = nfts.result.account_nfts;
    console.table(total_nft);

    var total = total_nft.map((v) => {
      return {
        ...v, // (...) Spread operator
        nft_url: xrpl.convertHexToString(v.URI),
      };
    });
    var real = await total.map((v) => {
      let a = v.nft_url.split("//");
      return { url: a[1], issuer: v.Issuer, token_id: v.NFTokenID };
    });
    Promise.all(
      real.map((vag) => {
        return axios
          .get("https://ipfs.io/ipfs/" + vag.url)
          .then((v) => {
            return { ...v.data, ...vag };
          })
          .catch((err) => null);
      })
    ).then((data) => {
      io.sockets.emit("list_of_nfts", data);
      client.disconnect();
      console.table(data[0]);
    });

    // console.log("Total NFT Details: ", nfts.result, + "\n\n\n\n\n\n\n\n")
  });
  cont.on("get_sell_offer", async (nftokenId) => {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();
    let nftSellOffers;
    try {
      nftSellOffers = await client.request({
        method: "nft_sell_offers",
        nft_id: nftokenId,
      });
    } catch (err) {
      console.log("No sell offers");
    }
    client.disconnect();
    io.sockets.emit("list_sell_offer", nftSellOffers);
  });
  cont.on("get_buy_offer", async (nftokenId) => {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();
    let nftBuyOffers;
    try {
      nftBuyOffers = await client.request({
        method: "nft_buy_offers",
        nft_id: nftokenId,
      });
    } catch (err) {
      console.log("No Buy offers.");
    }
    client.disconnect();
    io.sockets.emit("list_buy_offer", nftBuyOffers);
  });

  //socket.emit("user_token",result.application.issued_user_token);
});

const Sdk = new XummSdk(process.env.API_KEY, process.env.API_SECRET);

const appInfo = await Sdk.ping();
app.get("/signin", async (req, res) => {
  // console.log(appInfo.application.name)
  const request = {
    txjson: {
      TransactionType: "SignIn",
    },
  };
  const subscription = await Sdk.payload.createAndSubscribe(
    request,
    (event) => {
      console.log("event response code", event.data);

      // it is used to hold the node untill the request get signed
      if (Object.keys(event.data).indexOf("signed") > -1) {
        return event.data;
      }
    }
  );

  console.log("Subscription =======>\n", subscription.created.next.always);
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.send(subscription.created.refs.qr_png);
  console.log("raman check", subscription.created);
  const resolved = await subscription.resolved;
  // console.log("Resolved data +++++++++++++++++++++\n",resolved)

  const result = await Sdk.payload.get(resolved.payload_uuidv4);

  let ra = io.sockets.emit("user_token", {
    usertoken: result.application.issued_user_token,
    wallet_address: result.response.account,
  });
  console.log("raman socket", ra);
  // io.close();
});
app.post("/makebuyoffer", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  const transactionBlob = {
    txjson: {
      TransactionType: "NFTokenCreateOffer",
      Account: req.body.walletaddress,
      Owner: req.body.issuer,
      NFTokenID: req.body.tokenid,
      Amount: "1000",
      Fee: "10",
      Flags: 0, // buy Offer
    },
    user_token: req.body.usertoken,
  };
  console.log(transactionBlob);
  const subscription = await Sdk.payload.createAndSubscribe(
    transactionBlob,
    (event) => {
      console.log("New payload event:", event.data);

      //  The event data contains a property 'signed' (true or false), return :)
      if (Object.keys(event.data).indexOf("signed") > -1) {
        return event.data;
      }
    }
  );
  console.log("QR-Code", subscription.created.next);

  // wait untills the push notification will resolve
  const resolveData = await subscription.resolved;
  if (resolveData.signed === false) {
    console.log(" The sign request was rejected :(");
    res.send("transaction rejected");
  } else {
    console.log("Woohoo! The sign request was signed :)");

    const result = await Sdk.payload.get(resolveData.payload_uuidv4);
    console.log("On ledger TX hash:", result.response.txid);
    res.send("transaction accepted");
  }
});
app.post("/makeselloffer", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  const request = {
    txjson: {
      TransactionType: "NFTokenCreateOffer",
      Account: req.body.walletaddress,
      NFTokenID: req.body.tokenid,
      Amount: "1000",
      Flags: 1, // sell Offer
    },
    user_token: req.body.usertoken,
  };
  // push notification
  const subscription = await Sdk.payload.createAndSubscribe(
    request,
    (event) => {
      console.log("New payload event:", event.data);

      //  The event data contains a property 'signed' (true or false), return :)
      if (Object.keys(event.data).indexOf("signed") > -1) {
        return event.data;
      }
    }
  );

  // wait untills the push notification will resolve
  const resolveData = await subscription.resolved;
  if (resolveData.signed === false) {
    console.log(" The sign request was rejected :(");
    res.send("transaction rejected");
  } else {
    console.log("Woohoo! The sign request was signed :)");

    const result = await Sdk.payload.get(resolveData.payload_uuidv4);
    console.log("On ledger TX hash:", result.response.txid);
    res.send("transaction accepted");
  }
});
app.post("/acceptselloffer", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  const transactionBlob = {
    txjson: {
      TransactionType: "NFTokenAcceptOffer",
      Account: req.body.walletaddress,
      NFTokenSellOffer: req.body.selloffer,
    },
    user_token: req.body.usertoken,
  };

  // push notification
  const subscription = await Sdk.payload.createAndSubscribe(
    JSON.stringify(transactionBlob),
    (event) => {
      console.log("New payload event:", event.data);

      //  The event data contains a property 'signed' (true or false), return :)
      if (Object.keys(event.data).indexOf("signed") > -1) {
        return event.data;
      }
    }
  );

  // wait untills the push notification will resolve
  const resolveData = await subscription.resolved;
  if (resolveData.signed === false) {
    console.log(" The sign request was rejected :(");
    res.send("transaction cancelled");
  } else {
    console.log("Woohoo! The sign request was signed :)");

    const result = await Sdk.payload.get(resolveData.payload_uuidv4);
    console.log("On ledger TX hash:", result);
    res.send("transaction accepted");
  }
});
app.post("/acceptbuyoffer", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  const transactionBlob = {
    txjson: {
      TransactionType: "NFTokenAcceptOffer",
      Account: req.body.walletaddress,
      NFTokenBuyOffer: req.body.buyoffer,
    },
    user_token: req.body.usertoken,
  };

  // push notification
  const subscription = await Sdk.payload.createAndSubscribe(
    JSON.stringify(transactionBlob),
    (event) => {
      console.log("New payload event:", event.data);

      //  The event data contains a property 'signed' (true or false), return :)
      if (Object.keys(event.data).indexOf("signed") > -1) {
        return event.data;
      }
    }
  );

  // wait untills the push notification will resolve
  const resolveData = await subscription.resolved;
  if (resolveData.signed === false) {
    console.log(" The sign request was rejected :(");
    res.send("transaction cancelled");
  } else {
    console.log("Woohoo! The sign request was signed :)");

    const result = await Sdk.payload.get(resolveData.payload_uuidv4);
    console.log("On ledger TX hash:", result);
    res.send("transaction accepted");
  }
});
app.post("/mintnft", async (req, res) => {
  const IPFS = await import("ipfs-core");
  let results;

  if (req.files) {
    //console.log(req);
    var file = req.files.file;
    var filename = file.name;
    var name = req.body.Nftname;
    var attributes = req.body.Nftattributes;
    var userToken = req.body.usertoken;
    var walletaddress = req.body.walletaddress;
    // console.log(filename);
    //console.log(req.files);

    file.mv("./uploads/" + filename, async function (err) {
      if (err) {
        res.send(err);
      } else {
        const ipfs = await IPFS.create();

        let data = fs.readFileSync(__dirname + "/uploads/" + filename, {
          encoding: "utf8",
          flag: "r",
        });
        let options = {
          warpWithDirectory: false,
          progress: (prog) => console.log(`Saved :${prog}`),
        };

        ipfs.add(data, options).then(async (check) => {
          let metadata = {
            name: name,
            description: attributes,
            image: "https://ipfs.io/ipfs/" + check.path,
            attributes: [
              {
                trait_type: "Strength",
                value: 7,
                max_value: 10,
              },
              {
                trait_type: "Speed",
                value: 9,
                max_value: 10,
              },
              {
                trait_type: "Jump",
                value: 10,
                max_value: 10,
              },
              {
                trait_type: "Intelligence",
                value: 6,
                max_value: 10,
              },
            ],
          };
          let options1 = {
            warpWithDirectory: false,
            progress: (prog) => console.log(`Saved :${prog}`),
          };

          ipfs.add(JSON.stringify(metadata), options1).then(async (check1) => {
            // console.log("Metadata CID " + check1.path);
            const uri = xrpl.convertStringToHex("ipfs://" + check1.path);
            const standby_wallet = xrpl.Wallet.fromSecret(
              "sEd7XKra4i7kBmD3PUR7vagEURwsSE6"
            );
            // const issuer_wallet = xrpl.Wallet.fromSeed(
            //   "sEdVSaAar8cCtGXSqW5SMprZiikzX2E"
            // );
            const client = new xrpl.Client(
              "wss://xls20-sandbox.rippletest.net:51233"
            );
            await client.connect();
            // const request2 = {
            //   txjson: {
            //     TransactionType: "NFTokenMint",
            //     Account: walletaddress,
            //     Issuer: standby_wallet.classicAddress,
            //     TransferFee: 314,
            //     NFTokenTaxon: 1,
            //     Flags: 8,
            //     Fee: "10",
            //     URI: uri,
            //   },
            // user_token: userToken,
            // };
            // const trustSet_tx = {
            //   "TransactionType": "TrustSet",
            //   "Account": process.env.WALLET_ADDRESS,
            //   "LimitAmount": {
            //     "currency": ,
            //     "issuer": walletaddress,
            //     "value": standbyAmountField.value
            //   }
            // }
            const request2 = {
              TransactionType: "NFTokenMint",
              Account: walletaddress,
              URI: uri,
              Flags: 12,
              TransferFee: 314,
              Fee: 10,
              Issuer: standby_wallet.classicAddress,
              NFTokenTaxon: 0, //Required, but if you have no use for it, set to zero.
            };

            const tx_json = {
              TransactionType: "AccountSet",
              Account: standby_wallet.classicAddress,
              NFTokenMinter: walletaddress,
              SetFlag: 12,
            };

            const result = await client.submitAndWait(tx_json, {
              wallet: standby_wallet,
            });

            if (result.result.meta.TransactionResult == "tesSUCCESS") {
              results += "\nAccount setting succeeded.";
              results += JSON.stringify(result, null, 2);
              console.log(results);
            } else {
              throw "Error sending transaction: ${result}";
              results += "\nAccount setting failed.";
              console.log(results);
            }
            console.log("Account set");

            const subscription = await Sdk.payload.createAndSubscribe(
              request2,
              (event) => {
                console.log("New payload event:", event.data);

                //  The event data contains a property 'signed' (true or false), return :)
                if (Object.keys(event.data).indexOf("signed") > -1) {
                  return event.data;
                }
              }
            );

            console.log(
              "New payload created,URL:",
              subscription.created.next.always
            );
            console.log(
              "  > Pushed:",
              subscription.created.pushed ? "yes" : "no"
            );

            // wait the js engine untill the subscription payload is resolved
            const resolveData = await subscription.resolved;
            if (resolveData.signed === false) {
              console.log(" The sign request was rejected :(");
              res.setHeader(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS, PUT, PATCH, DELETE"
              );

              // Request headers you wish to allow
              res.setHeader(
                "Access-Control-Allow-Headers",
                "X-Requested-With,content-type"
              );
              res.send("Rejected Sign by Owner");
            } else {
              console.log("Woohoo! The sign request was signed :)");

              const result = await Sdk.payload.get(resolveData.payload_uuidv4);
              console.log("On ledger TX hash:", result.response.txid);
              res.setHeader(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS, PUT, PATCH, DELETE"
              );

              // Request headers you wish to allow
              res.setHeader(
                "Access-Control-Allow-Headers",
                "X-Requested-With,content-type"
              );
              res.send("NFT minted Successfully");
            }

            // console.log('New payload created,URL:', subscription.created.next.always)
            //console.log('  > Pushed:', subscription.created.pushed ? 'yes' : 'no')

            // wait the js engine untill the subscription payload is resolved
            // const resolveData = await subscription.resolved
            // if (resolveData.signed === false) {
            //     console.log(' The sign request was rejected :(')
            // } else {
            //     console.log('Woohoo! The sign request was signed :)')

            //     const result =  Sdk.payload.get(resolveData.payload_uuidv4)
            //     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

            //     // Request headers you wish to allow
            //     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
            //     res.send(result)
            // }
          });
        });
      }
    });
  }
});

// app.post('/listnft', async (req, res) => {
//     console.log("Request object:++++++",req.body)
//     let wallet = req.body.walletaddress;
//     const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233")
//     await client.connect();
//     const nfts = await client.request({
//         method: "account_nfts",
//         account: wallet
//     })
//     const total_nft = nfts.result.account_nfts
//     console.log(total_nft)
//     var total = total_nft.map((v) => {
//         return {
//             ...v,               // (...) Spread operator
//             nft_url:xrpl.convertHexToString(v.URI)
//         }
//     });
//     // console.log("Total NFT Details: ", nfts.result, + "\n\n\n\n\n\n\n\n")
//     const balance = await client.getXrpBalance(wallet)
//     console.log("Balance", balance)
//     const result = {
//         nft:total,
//         balance: balance
//     }
//     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
//     res.send(result)

//     client.disconnect();
// })

server.listen(5000, () => {
  console.log("SERVER IS RUNNING");
});
