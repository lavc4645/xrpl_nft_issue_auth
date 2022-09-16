import React, { useState, useEffect } from "react";
import queryString from "query-string";
import "bootstrap/dist/css/bootstrap.min.css";
import "./purchase.css";

import axios from "axios";

import Modals from "./modal";
import io from "socket.io-client";
const socket = io.connect("http://localhost:5001");
function Purchase() {
  const value = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });

  const [modalIsOpen, setIsOpen] = React.useState(false);
  const [usertoken, setusertoken] = useState(null);
  const [walletaddress, setwalletaddress] = useState(null);
  const [iframeUrl, setIframeUrl] = React.useState(null);
  const [selltokenid, setselltokenid] = useState(null);
  const [buytokenid, setbuytokenid] = useState(null);
  const [buyamount, setbuyamount] = useState(0);
  const [sellamount, setsellamount] = useState(0);

  // Get the value of "some_key" in eg "https://example.com/?some_key=some_value"

  const sign = async (e) => {
    e.preventDefault();
    const response = await axios.get(`http://localhost:5001/signin`);
    console.log(response);
    setIsOpen(true);
    setIframeUrl(response.data);
  };
  const makebuyoffer = async (e) => {
    console.log(value.tokenid, value.issuer);
    const formdata = new FormData();
    formdata.append("walletaddress", walletaddress);
    formdata.append("usertoken", usertoken);
    formdata.append("tokenid", value.tokenid);
    formdata.append("issuer", value.issuer);
    formdata.append("amount", buyamount);
    e.preventDefault();
    const response = await axios.post(
      `http://localhost:5001/makebuyoffer`,
      formdata
    );
    console.log(response);
    alert(response.data);
  };

  const makeselloffer = async (e) => {
    const formdata = new FormData();
    formdata.append("walletaddress", walletaddress);
    formdata.append("usertoken", usertoken);
    formdata.append("tokenid", value.tokenid);
    formdata.append("amount", sellamount);
    e.preventDefault();
    const response = await axios.post(
      `http://localhost:5001/makeselloffer`,
      formdata
    );
    console.log(response);
    alert(response.data);
  };

  // //action to accept offers
  //   const acceptoffer = async (e) => {
  //     const formdata = new FormData();
  //     formdata.append("walletaddress", walletaddress);
  //     formdata.append("usertoken", usertoken);
  //     formdata.append("tokenid", value.tokenid);
  //     formdata.append("amount", sellamount);
  //     e.preventDefault();
  //     const response = await axios.post(
  //       `http://192.168.20.76:5001/makeselloffer`,
  //       formdata
  //     );
  //     console.log(response);
  //     alert(response.data);
  //   };

  const acceptbuyoffer = async (buy_token_id) => {
    const formdata = new FormData();
    formdata.append("walletaddress", walletaddress);
    formdata.append("usertoken", usertoken);
    formdata.append("buyoffer", buy_token_id);

    const response = await axios.post(
      `http://localhost:5001/acceptbuyoffer`,
      formdata
    );
    console.log(response);
    alert(response.data);
  };
  const acceptselloffer = async (sell_token_id) => {
    const formdata = new FormData();
    formdata.append("walletaddress", walletaddress);
    formdata.append("usertoken", usertoken);
    formdata.append("selloffer", sell_token_id);

    const response = await axios.post(
      `http://localhost:5001/acceptselloffer`,
      formdata
    );
    console.log(response);
    alert(response.data);
  };
  useEffect(() => {
    //  console.log("abc")
    socket.on("user_token", (data) => {
      // alert(data);
      if (data) {
        setIsOpen(false);
        setusertoken(data.usertoken);
        setwalletaddress(data.wallet_address);
        socket.emit("get_buy_offer", value.tokenid);
        socket.emit("get_sell_offer", value.tokenid);
      }
      console.log(data);
    });

    socket.on("list_sell_offer", (data) => {
      if (data) {
        setselltokenid(data.result.offers[0].nft_offer_index);
        console.log(data);
        setselltokenid(data);
      }
    });

    socket.on("list_buy_offer", (data) => {
      if (data) {
        // setbuytokenid(data.result.offers[0].nft_offer_index);
        setbuytokenid(data);
        console.log(data.result.offers[0].nft_offer_index);
        console.log(data);
      }
    });
  }, [socket]);

  return (
    <>
      <div class="container">
        <div class="row justify-content-center pt-5">
          <div class="col-md-12">
            <div class="talkForm">
              <div class="d-flex justify-content-between align-items-start">
                <h2 class="titleComn mb-5">
                  Mint Your <span>NFT</span>
                </h2>
                {walletaddress ? (
                  <h4>Your Wallet Address : {walletaddress}</h4>
                ) : (
                  <a href="javascript:void(0)" className="cnBtn" onClick={sign}>
                    Connect Wallet Button
                  </a>
                )}
              </div>
              <div class="row">
                <div class="col-md-6">
                  <iframe
                    src={value.image}
                    class="img-fluid"
                    width="200"
                    height="200"
                  ></iframe>
                </div>
                <div class="col-md-6 nftTitle">
                  <h1>{value.name}</h1>
                  <p>{value.description}</p>
                  <ul class="listBtn">
                    {walletaddress !== null ? (
                      walletaddress == value.issuer ? (
                        <>
                          <div className="row">
                            <div className="col-md-3  form-group">
                              <input
                                id=""
                                name=""
                                type="text"
                                placeholder="Add value...."
                                value={sellamount}
                                onChange={(e) => setsellamount(e.target.value)}
                                className="form-control"
                              ></input>
                            </div>
                            <li>
                              <a
                                href="javascript:void(0)"
                                onClick={makeselloffer}
                              >
                                Make Sell Offer
                              </a>
                            </li>
                            {/* <li>
                          <a href="javascript:void(0)" onClick={acceptbuyoffer}>
                            Accept Buy Offer
                          </a>
                        </li> */}
                            <div />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="row">
                            <div className="col-md-6 form-group">
                              <input
                                id=""
                                name=""
                                type="text"
                                placeholder="Add value...."
                                value={buyamount}
                                onChange={(e) => setbuyamount(e.target.value)}
                                className="form-control"
                              ></input>
                            </div>
                            <li>
                              <a
                                href="javascript:void(0)"
                                onClick={makebuyoffer}
                              >
                                Make Buy Offer
                              </a>
                            </li>
                            {/* <li>
                          <a
                            href="javascript:void(0)"
                            onClick={acceptselloffer}
                          >
                            Accept Sell Offer
                          </a>
                        </li> */}
                          </div>
                        </>
                      )
                    ) : (
                      ""
                    )}
                  </ul>
                </div>
                {/* <div style={{marginLeft:"1000px"}}>
                <a href="javascript:void(0)" className="cnBtn" onClick={acceptoffer}>
                  Action
                </a>
                </div> */}
                <div className="row">
                  <h1 style={{ marginBottom: "20px" }}>Buy offers</h1>
                  <div className="col-md-12">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Amount</th>
                          <th>Flags</th>
                          <th>NFT Offer Index</th>
                          <th>Owner</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buytokenid
                          ? buytokenid.result.offers.map((data) => (
                              <tr>
                                <td>{data.amount}</td>
                                <td>{data.flags}</td>
                                <td>{data.nft_offer_index}</td>
                                <td>{data.owner}</td>
                                {walletaddress !== null ? (
                                  <td>
                                    {walletaddress === value.issuer ? (
                                      <button
                                        onClick={() =>
                                          acceptbuyoffer(data.nft_offer_index)
                                        }
                                      >
                                        Accept Offer
                                      </button>
                                    ) : (
                                      ""
                                    )}
                                    {/* <button
                                      onClick={() =>
                                        acceptbuyoffer(data.nft_offer_index)
                                      }
                                    >
                                      Accept Offer
                                    </button> */}
                                  </td>
                                ) : (
                                  console.log("sj")
                                )}
                              </tr>
                            ))
                          : ""}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="row">
                  <h1 style={{ marginBottom: "20px" }}>Sell offers</h1>
                  <div className="col-md-12">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Amount</th>
                          <th>Flags</th>
                          <th>NFT Offer Index</th>
                          <th>Owner</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selltokenid
                          ? selltokenid.result.offers.map((data) => (
                              <tr>
                                <td>{data.amount}</td>
                                <td>{data.flags}</td>
                                <td>{data.nft_offer_index}</td>
                                <td>{data.owner}</td>
                                <td>
                                  {walletaddress !== value.issuer ? (
                                    <button
                                      onClick={() =>
                                        acceptselloffer(data.nft_offer_index)
                                      }
                                    >
                                      Accept Offer
                                    </button>
                                  ) : (
                                    ""
                                  )}
                                  {/* <button 
                                    onClick={() =>
                                      acceptselloffer(data.nft_offer_index)
                                    }
                                  >
                                    Accept Offer
                                  </button> */}
                                </td>
                              </tr>
                            ))
                          : ""}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modals modalsIsOpen={modalIsOpen} iframeUrl={iframeUrl} />
    </>
  );
}
export default Purchase;
