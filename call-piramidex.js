const Eth = require("eth-lib");
const rpc = Eth.rpc("https://rinkeby.infura.io/sE0I5J1gO2jugs9LndHR");
const abi = require("./abi.js");

const api = async (method, params) => {
  const tx = await Eth.transaction.addDefaults(rpc, {
    from: "0x48ec2F135488C0E0F145e7689783FaE7e305a9ba",
    to: "0x1317b58f6e0126f65969c953551b784b06633b1a",
    data: abi.encodeCall(method, params)
  }, "latest");
  return rpc("eth_call", [tx, "latest"]);
};

api.big = abi.big;

module.exports = api;
