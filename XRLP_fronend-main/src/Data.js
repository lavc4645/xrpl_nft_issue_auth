import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import Modals from "./modal";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5001");

function Data() {
  const [Nftname, setNftname] = useState("");
  const [Nftattributes, setNftattributes] = useState("");
  const [Transferfee, setTransferfee] = useState(314);
  const [Minterfee, setMinterfee] = useState(10);
  const [Nftimages, setNftimages] = useState("");
  const [modalIsOpen, setIsOpen] = React.useState(false);
  const [iframeUrl, setIframeUrl] = React.useState(null);
  const [usertoken, setusertoken] = useState(null);
  const [walletaddress, setwalletaddress] = useState(null);
  const [getmintnft, setgetmintnft] = useState();

  const handleChange = async (e) => {
    e.preventDefault();

    if (Nftname) {
      const formdata = new FormData();
      formdata.append("Nftname", Nftname);
      formdata.append("Nftattributes", Nftattributes);
      formdata.append("file", Nftimages);
      formdata.append("transferFee", Transferfee);
      formdata.append("fee", Minterfee);
      formdata.append("usertoken", usertoken);
      formdata.append("walletaddress", walletaddress);

      console.log(formdata);
      console.log(walletaddress);
      const response = await axios.post(
        `http://localhost:5001/mintnft`,
        formdata
      );
      console.log(response);
      alert(" NFT minted successfully" + " " + response.data);
    }
  };

  const sign = async (e) => {
    e.preventDefault();
    const response = await axios.get(`http://localhost:5001/signin`);
    console.log(response);
    setIsOpen(true);
    setIframeUrl(response.data);

    //emit event to open qrcode
    socket.emit("qr_openend");
  };

  //bind user_token event with data (event handler) also bind get_nft_list event with data
  useEffect(() => {
    // alert("raman");
    socket.on("user_token", (data) => {
      // alert(data);
      if (data) {
        setIsOpen(false);
        setusertoken(data.usertoken);
        setwalletaddress(data.wallet_address);
        socket.emit("get_nft_list", data.wallet_address);
      }
      console.log(data);
    });
    socket.on("list_of_nfts", (data) => {
      setgetmintnft(data);
      console.log(data);
    });
  }, [socket]);

  return (
    <>
      <div class="container">
        <div class="row justify-content-center pt-5">
          <div class="col-md-12">
            <div className="talkForm">
              <div className="d-flex justify-content-between align-items-start">
                <h2 className="titleComn mb-5">
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
              <form
                className="form-horizontal"
                action=""
                onSubmit={handleChange}
              >
                <div className="row">
                  <div className="col-md-2  form-group">
                    <input
                      id=""
                      name=""
                      type="text"
                      placeholder="NFT Name"
                      value={Nftname}
                      onChange={(e) => setNftname(e.target.value)}
                      className="form-control"
                    ></input>
                  </div>
                  <div className="col-md-2  form-group">
                    <input
                      id=""
                      name=""
                      type="text"
                      placeholder="Charge Transfer Fee"
                      value={Transferfee}
                      onChange={(e) => setTransferfee(e.target.value)}
                      className="form-control"
                    ></input>
                  </div>
                  <div className="col-md-2  form-group">
                    <input
                      id=""
                      name=""
                      type="text"
                      placeholder="Fee For Minter"
                      value={Minterfee}
                      onChange={(e) => setMinterfee(e.target.value)}
                      className="form-control"
                    ></input>
                  </div>
                  <div className="col-md-2  form-group">
                    <input
                      id=""
                      name=""
                      type="text"
                      placeholder="NFT Attribute"
                      value={Nftattributes}
                      onChange={(e) => setNftattributes(e.target.value)}
                      className="form-control"
                    ></input>
                  </div>
                  <div className="col-md-2  form-group">
                    <input
                      id=""
                      name=""
                      type="file"
                      placeholder="Upload Image"
                      onChange={(e) => setNftimages(e.target.files[0])}
                      className="form-control"
                    ></input>
                  </div>

                  <div className="col-md-2  form-group">
                    <button type="submit">Mint NFT</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>NFT Name</th>
                  <th>NFT Attribute</th>
                  <th>Image Upload</th>
                </tr>
              </thead>
              <tbody>
                {getmintnft
                  ? getmintnft.map((v) => {
                      if (!v) {
                        return null;
                      }

                      return (
                        <tr>
                          <td>
                            <a
                              href={`/purchase?issuer=${v.issuer}&tokenid=${v.token_id}&name=${v.name}&image=${v.image}&description=${v.description}`}
                            >
                              {v.name}
                            </a>
                          </td>
                          <td>{v.description}</td>
                          <td class="imgSmall">
                            <img src={v.image} class="img-fluid" />
                          </td>
                        </tr>
                      );
                    })
                  : ""}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Modals modalsIsOpen={modalIsOpen} iframeUrl={iframeUrl} />
    </>
  );
}

export default Data;
