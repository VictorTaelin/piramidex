const Eth = require("eth-lib");
const rpc = Eth.rpc("https://rinkeby.infura.io/sE0I5J1gO2jugs9LndHR");
const pir = require("./call-piramidex.js");

module.exports = async () => {
  // TODO: investigate bug where decoded strings end with tons of \u0000
  const fixString = str => {
    return str.slice(0, str.indexOf("\u0000"));
  }

  var state = {};

  // Gets globals
  state.blockNumber = Eth.bytes.toNumber(await rpc("eth_blockNumber", []));
  state.balance = Eth.bytes.toNumber(await pir.call("contractBalance()", [])) / 1000000000000000000;
  state.tokensLength = Eth.bytes.toNumber(await pir.call("tokensLength()", []));
  state.usersLength = Eth.bytes.toNumber(await pir.call("usersLength()", []));

  // Gets tokens
  state.tokens = [];
  for (var i = 0; i < state.tokensLength; ++i) {
    var [name, count, price] = await Promise.all([
      pir.call("tokenName(uint256)", [pir.big(String(i))]),
      pir.call("tokenCount(uint256)", [pir.big(String(i))]),
      pir.call("tokenPrice(uint256)", [pir.big(String(i))]),
    ]);
    state.tokens.push({
      id: i,
      name: fixString(Eth.bytes.toString(name)),
      count: Eth.bytes.toNumber(count),
      price: Eth.bytes.toNumber(price) / 1000000000000000000
    });
  }

  // Gets users
  state.users = [];
  for (var i = 0; i < state.usersLength; ++i) {
    var tokenQueries = [];
    for (var j = 0; j < state.tokensLength; ++j) {
      tokenQueries.push(
        pir.call("userTokenCount(uint256,uint256)",[
          pir.big(String(i)),
          pir.big(String(j))
        ])
      );
    }
    var [name, addr, tokenCount] = await Promise.all([
      pir.call("userName(uint256)", [pir.big(String(i))]),
      pir.call("userAddr(uint256)", [pir.big(String(i))]),
      Promise.all(tokenQueries)
    ]);
    var address = Eth.bytes.slice(12,32,addr);
    var balance = await rpc("eth_getBalance", [address, "latest"]);
    var tokens = {};
    tokenCount.forEach((countHex, i) => {
      const count = Eth.bytes.toNumber(countHex);
      if (count > 0) {
        tokens[state.tokens[i].name] = count;
      }
    });
    state.users.push({
      id: i,
      name: fixString(Eth.bytes.toString(name)),
      address: address,
      balance: Eth.bytes.toNumber(balance) / 1000000000000000000,
      tokens: tokens
    });
  };

  return state;
}
