require("babel-polyfill");
const Inferno = require("inferno");
const createClass = require("inferno-create-class").createClass;
const Eth = require("eth-lib");
const rpc = Eth.rpc("https://rinkeby.infura.io/sE0I5J1gO2jugs9LndHR");
const pir = require("./call-piramidex.js");
const pirAddr = require("./piramidex-address.json");
const fetchPiramidex = require("./fetch-piramidex.js");

const Area = createClass({
  getInitialState() {
    return {expand: false};
  },
  toggle() {
    this.setState({expand: !this.state.expand});
  },
  render() {
    return <div 
      style={{
        width: "100%",
        lineHeight: "32px",
        fontFamily: "helvetica",
      }}>
      <div
        onClick={() => this.toggle()}
        style={{
          fontSize: "18px",
          cursor: "pointer",
          textDecoration: "underline",
          padding: "4px"}}>
        <span className="unselectable">{this.props.title}</span>
        {!this.props.right ? null : <span style={{float:"right"}}>{this.props.right}</span>}
      </div>
      {this.state.expand
        ? <div style={{padding:"4px"}}>
          {this.props.children}
        </div>
        : null}
    </div>;
  }
});

const Link = (title, action) => {
  const style = {
    textDecoration: "underline",
    cursor: "pointer"
  };
  return <span style={style} className="unselectable" onClick={action}>
    {title}
  </span>;
};

const Value = eth => {
  return <span>
    <span>{eth.toFixed(3)} </span>
    <span style={{fontSize: "70%", fontWeight: "bold"}}>ETH</span>
  </span>;
};

const Token = (token, user, buy, sell) => {
  const cell = (child, width, last) => {
    return <td style={{width: width+"px", textAlign: last ? "right" : "left", fontSize: "13px"}}>
      {child}
    </td>;
  };
  const Buy = Link("BUY", () => buy(token));
  const Sell = Link("SELL", () => sell(token));
  return <table style={{marginBottom: "6px"}}>
    <thead style={{fontSize:"16px"}}>
      <tr>
        <td colspan={3}>
          {token.name}
        </td>
      </tr>
    </thead>
    <tbody style={{fontFamily:"monospace", color: "#707177"}}>
      <tr>
        {cell(["Price: ", Value(token.price)], 140)}
        {cell(["YouOwn: ", (!user ? "-" : user.tokens[token.name] || 0)], 100)}
        {cell(Buy, 40, true)}
      </tr>
      <tr>
        {cell(["MkCap: ", Value(token.price * token.count)], 140)}
        {cell(["Supply: ", token.count], 100)}
        {cell(Sell, 40, true)}
      </tr>
    </tbody>
  </table>;
};

const UserTitle = user => 
  <span>
    {Link(user.name, () => alert(user.address))}
    {" "}
    ({Value(user.balance)})
  </span>;

const User = user => {
  return <div style={{marginBottom: "10px"}}>
    <div style={{fontSize:"16px", lineHeight: "16px", marginBottom: "4px"}}>
      {UserTitle(user)}
    </div>
    <table borderCollapse="collapse" cellpadding="0" cellspacing="0" border="0">
      <tbody>
        {Object.keys(user.tokens).map(tokenName => {
          return <tr style={{fontSize:"12px"}}>
            <td style={{paddingRight: "4px", paddingBottom: "2px", textAlign: "right", width: "32px"}}>
              {user.tokens[tokenName]}
            </td>
            <td style={{color:"#777777", fontStyle:"italic"}}>
              "{tokenName}"
            </td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
};


const Piramidex = createClass({
  getInitialState() {
    return null;
  },
  componentDidMount() {
    setTimeout(() => {
      this.refresh();
    }, 0);
  },
  getPrivateKey() {
    if (!localStorage.getItem("piramidex-private-key")) {
      var privateKey = "";
      while (!/0x[0-9a-z]{64}/.test(privateKey)) {
        privateKey = prompt("Enter your private key:");
        if (privateKey.slice(0, 2) !== "0x") {
          privateKey = "0x" + privateKey;
        }
      };
      localStorage.setItem("piramidex-private-key", privateKey);
    }
    return localStorage.getItem("piramidex-private-key");
  },
  async refresh() {
    const account = Eth.account.fromPrivate(this.getPrivateKey());
    const lastBlockNumber = this.state && this.state.blockNumber;
    const blockNumber = Eth.bytes.toNumber(await rpc("eth_blockNumber", []));
    if (lastBlockNumber !== blockNumber) {
      const getBalance = rpc("eth_getBalance", [account.address,"latest"]);
      const [piramidex, balance] = await Promise.all([fetchPiramidex(), getBalance]);
      account.balance = Eth.bytes.toNumber(balance) / 1000000000000000000;
      this.setState({piramidex, account, blockNumber, blink: true});
      setTimeout(() => this.setState({blink: false}), 2000);
      if (!this.user() && !this.state.registerName) {
        const registerName = prompt("Choose an user name:");
        this.setState({registerName});
        this.register(registerName);
      };
    };
    setTimeout(() => this.refresh(), 1000);
  },
  user() {
    const myUsers = this.state.piramidex.users.filter(user => {
      return user.address === this.state.account.address.toLowerCase();
    });
    return myUsers.length > 0
      ? myUsers[0]
      : null;
  },
  async send(method, params, weiVal, conf) {
    if (!conf || confirm("Are you sure?")) {
      const txHash = await pir.send(method, params, this.state.account, weiVal);
      if (!txHash.error) {
        if (conf) alert("TxHash: " + txHash);
      } else {
        if ( txHash.error.indexOf("known transaction") !== -1
          || txHash.error.indexOf("replacement transaction") !== -1) {
          if (conf) alert("Last transaction wasn't mined yet. Try again later.");
        } else {
          if (conf) alert(txHash.error);
        }
      }
    }
  },
  async register(userName) {
    const name = userName;
    const method = "register(bytes32)";
    const params = [Eth.bytes.padRight(32,Eth.bytes.fromString(name))];
    const weiVal = Eth.nat.fromEther(0);
    return this.send(method, params, weiVal, false);
  },
  async createToken(tokenName) {
    const name = tokenName || prompt("Token name:");
    const method = "createToken(bytes32)";
    const params = [Eth.bytes.padRight(32,Eth.bytes.fromString(name))];
    const weiVal = Eth.nat.fromEther(0);
    return this.send(method, params, weiVal, true);
  },
  async buy(token) {
    const method = "buy(uint256,uint256)";
    const params = [pir.big(String(this.user().id)), pir.big(String(token.id))];
    const weiVal = Eth.nat.fromEther(token.price * 2);
    return this.send(method, params, weiVal, true);
  },
  async sell(token) {
    const method = "sell(uint256,uint256)";
    const params = [pir.big(String(this.user().id)), pir.big(String(token.id))];
    const weiVal = Eth.nat.fromEther(0);
    return this.send(method, params, weiVal, true);
  },
  render() {
    if (!this.state) {
      return <div>Loading...</div>;
    }

    const user = this.user();
    const account = this.state.account;

    const Piramidex = <table style={{
      width:"300px",
      marginBottom:"6px",
      fontSize: "13px",
      fontFamily: "monospace"}}>
      <tr>
        <td>Network:</td>
        <td>Ethereum (Rinkeby)</td>
      </tr>
      <tr>
        <td>Network blocknum:</td>
        <td>{this.state.piramidex.blockNumber}</td>
      </tr>
      <tr>
        <td>Contract address:</td>
        <td>{Link("show", () => alert(pirAddr))}</td>
      </tr>
      <tr>
        <td>Contract balance:</td>
        <td>{Value(this.state.piramidex.balance)}</td>
      </tr>
      <tr>
        <td>Contract tokens:</td>
        <td>{this.state.piramidex.tokensLength}</td>
      </tr>
      <tr>
        <td>Contract users:</td>
        <td>{this.state.piramidex.usersLength}</td>
      </tr>
      <tr>
        <td>Your name:</td>
        <td>
          <span>{user ? user.name : "(signing up)"}</span>
        </td>
      </tr>
      <tr>
        <td>Your balance:</td>
        <td>{Value(account.balance)}</td>
      </tr>
      <tr>
        <td>Your address:</td>
        <td>{Link("show", () => alert(account.address))}</td>
      </tr>
      <tr>
        <td>Your private key:</td>
        <td>
          {Link("show", () => alert(account.privateKey))}
          {" "}
          {Link("forget", () => {
            if (confirm("This will ERASE your private key from disk.\nThis action is IRREVERSIBLE.\nAre you sure?")) {
              localStorage.clear();
              location.reload();
            }
          })}
        </td>
      </tr>
    </table>;

    const TokenList = this.state.piramidex.tokens.map(token => {
      return Token(token, user, (t)=>this.buy(t), (t)=>this.sell(t));
    });

    const UserList = this.state.piramidex.users.map(User);


    const userInfo = user ? UserTitle(user) : "(signing up as '" + this.state.registerName + "'...)";

    return <div 
      className={this.state.blink ? "blink" : ""}
      style={{
        width:"100%",
        minHeight:"100vh",
        backgroundColor: "#FAFAFA",
        color: "#505154",
      }}>
      <Area title="PIRAMIDEX" right={userInfo}>{Piramidex}</Area>
      <Area title="User List">{UserList}</Area>
      <Area title="Token List">{TokenList}</Area>
      <Area title={Link("Create Token", async () => this.createToken())}></Area>
    </div>;
  }
});

//window.onload = () => {
  //(async () => {
    //document.getElementById("main").innerHTML = JSON.stringify(await pir(), null, 2);
  //})();
//};

window.onload = () => {
  Inferno.render(<Piramidex/>, document.getElementById("main"));
};
