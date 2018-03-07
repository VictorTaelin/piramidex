const Inferno = require("inferno");
const createClass = require("inferno-create-class").createClass;

const Eth = require("eth-lib");
const rpc = Eth.rpc("https://rinkeby.infura.io/sE0I5J1gO2jugs9LndHR");
const pir = require("./call-piramidex.js");

const query = async () => {
  // TODO: investigate bug where decoded strings end with tons of \u0000
  const fixString = str => {
    return str.slice(0, str.indexOf("\u0000"));
  }

  var state = {};

  state.blockNumber = await rpc("eth_blockNumber", []);
  console.log(state.blockNumber);

  state.tokensLength = Eth.bytes.toNumber(await pir("tokensLength()", []));
  console.log(state.tokensLength);

  state.tokens = [];
  for (var i = 0; i < state.tokensLength; ++i) {
    var [name, count, price] = await Promise.all([
      pir("tokenName(uint256)", [pir.big(String(i))]),
      pir("tokenCount(uint256)", [pir.big(String(i))]),
      pir("tokenPrice(uint256)", [pir.big(String(i))]),
    ]);
    state.tokens.push({
      name: fixString(Eth.bytes.toString(name)),
      count: Eth.bytes.toNumber(count),
      price: Eth.bytes.toNumber(price)
    });
  }
  console.log(state.tokens);

  state.usersLength = Eth.bytes.toNumber(await pir("usersLength()", []));
  console.log(state.usersLength);

  state.users = [];
  for (var i = 0; i < state.usersLength; ++i) {
    var tokenQueries = [];
    for (var j = 0; j < state.tokensLength; ++j) {
      tokenQueries.push(
        pir("userTokenCount(uint256,uint256)",[
          pir.big(String(i)),
          pir.big(String(j))
        ])
      );
    }
    var [name, addr, tokenCount] = await Promise.all([
      pir("userName(uint256)", [pir.big(String(i))]),
      pir("userAddr(uint256)", [pir.big(String(i))]),
      Promise.all(tokenQueries)
    ]);
    console.log(name, addr, tokenCount);
    var tokens = {};
    tokenCount.forEach((countHex, i) => {
      const count = Eth.bytes.toNumber(countHex);
      if (count > 0) {
        tokens[state.tokens[i].name] = count;
      }
    });
    state.users.push({
      name: fixString(Eth.bytes.toString(name)),
      addr: Eth.bytes.slice(20,32,addr),
      tokens: tokens
    });
  };

  return state;
};

(async () => {
  console.log(JSON.stringify(await query(), null, 2));
  //console.log(await rpc("eth_blockNumber", []));
  //console.log(await pir("usersLength()",[]));
  //console.log(Eth.bytes.toString(await pir("userName(uint256)",[pir.big("0")])));
})();

//window.onload = () => {
  //Inferno.render(<Piramidex/>, document.getElementById("main"));
//};
