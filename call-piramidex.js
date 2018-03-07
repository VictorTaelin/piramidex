const Eth = require("eth-lib");
const rpc = Eth.rpc("https://rinkeby.infura.io/sE0I5J1gO2jugs9LndHR");
const abi = require("./abi.js");
const pirAddr = require("./piramidex-address.json");

const api = {};

api.call = async (method, params, from) => {
  var tx0 = {};
  tx0.from = from || "0x48ec2F135488C0E0F145e7689783FaE7e305a9ba";
  tx0.to = pirAddr;
  tx0.data = abi.encodeCall(method, params);
  var tx1 = await Eth.transaction.addDefaults(rpc, tx0, "latest");
  return rpc("eth_call", [tx1, "latest"]);
};

api.send = async (method, params, acc, value) => {
  var tx0 = {};
  tx0.from = acc.address;
  tx0.to = "0x1317b58f6e0126f65969c953551b784b06633b1a";
  tx0.data = abi.encodeCall(method, params);
  tx0.value = value;
  var tx1 = await Eth.transaction.addDefaults(rpc, tx0);
  var tx2 = Eth.transaction.sign(tx1, acc);
  return rpc("eth_sendRawTransaction", [tx2])
};

api.big = abi.big;

module.exports = api;
