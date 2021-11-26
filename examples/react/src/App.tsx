import CloverWebInjected from '@clover-network/web-wallet-sdk';
import React from 'react';
import { recoverTypedMessage } from 'eth-sig-util';
import { ethers } from 'ethers';
import * as solanaWeb3 from "@solana/web3.js";
import { getV3TypedData, getV4TypedData } from './data';
import web3Obj from './helper';
import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import {
  u8aToHex,
  u8aWrapBytes,
} from "@polkadot/util";
import { initApi, api } from './apiUtils'

// import CloverWebInjected from './clover-web-inject/index';

const clvInject = new CloverWebInjected({ zIndex: 99999, devEnv: true });
const tokenAbi = require('human-standard-token-abi');
let currentInjected;

class App extends React.Component {
  state = {
    publicAddress: '',
    solAddress: '',
    polkadotAddress: '',
    chainId: '0x3',
  }

  async componentDidMount() {
    await this.initPolkaApi()
  }

  initPolkaApi = async () => {
    await initApi()
  }

  cloverInit = async () => {
    const { chainId } = this.state
    await clvInject.init({
      network: {
        chainId,
      },
      enableLogging: true,
    });
  }

  onlylogin = async () => {
    try {
      await this.cloverInit()
    } catch(e) {
      console.log(e)
    }
    await clvInject.login();
    web3Obj.setClvWeb3(clvInject.provider);
    clvInject.provider.on('accountsChanged', (accounts) => {
      console.log(accounts, 'accountsChanged');
      this.setState({
        publicAddress: (Array.isArray(accounts) && accounts[0]) || '',
      });
    });
    const accounts = await web3Obj.web3.eth.getAccounts();
    console.log('accounts[0]', accounts[0]);
  }
  solanaLogin = async () => {
    try {
      await this.cloverInit()
    } catch(e) {
      console.log(e)
    }
    await clvInject.solLogin();
    const solAddress = await clvInject.clover_solana.getAccount();
    console.log('solAddress:', solAddress);
    this.setState({
      solAddress: solAddress,
    });
  }

  polkadotLogin = async () => {
    try {
      await this.cloverInit()
    } catch(e) {
      console.log(e)
    }
    await clvInject.polkadotLogin();
    const injected: any = await web3Enable('clv');

    currentInjected = injected[0]
    if (!injected.length) {
      return {
        message: "Not found wallet",
        status: "error",
      };
    }
    const polkadotAddress = await web3Accounts({ ss58Format: 42 });
    console.log('polkadotAddress:', polkadotAddress);
    this.setState({
      polkadotAddress: polkadotAddress[0].address,
    });
  }

  sendEth = (): void => {
    const { web3 } = web3Obj;
    const { publicAddress } = this.state;
    web3.eth
      .sendTransaction({ from: publicAddress, to: publicAddress, value: web3.utils.toWei('0.01') })
      .then((resp) => this.console(resp))
      .catch(console.error);
  }

  signMessage = (): void => {
    const { web3 } = web3Obj;
    const { publicAddress } = this.state;
    // hex message
    const message = '0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad';
    (web3.currentProvider as any)?.send(
      {
        method: 'eth_sign',
        params: [publicAddress, message],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        return this.console('sign message => true', result);
      },
    );
  }

  signTypedDataV1 = (): void => {
    const { publicAddress } = this.state;
    const typedData = [
      {
        type: 'string',
        name: 'message',
        value: 'Hi, Alice!',
      },
      {
        type: 'uint8',
        name: 'value',
        value: 10,
      },
    ];
    const currentProvider = web3Obj.web3.currentProvider as any;
    currentProvider.send(
      {
        method: 'eth_signTypedData',
        params: [typedData, publicAddress],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }

        const recovered = recoverTypedMessage(
          {
            data: typedData,
            sig: result.result,
          },
          'V1',
        );

        if (publicAddress && recovered.toLowerCase() === publicAddress?.toLowerCase()) {
          return this.console(`sign typed message v1 => true, Singature: ${result.result} Recovered signer: ${publicAddress}`, result);
        }
        return this.console(`Failed to verify signer, got: ${recovered}`);
      },
    );
  }

  signTypedDataV3 = (): void => {
    const { chainId, publicAddress } = this.state;
    const typedData = getV3TypedData(chainId);
    const currentProvider = web3Obj.web3.currentProvider as any;
    currentProvider.send(
      {
        method: 'eth_signTypedData_v3',
        params: [publicAddress, JSON.stringify(typedData)],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const recovered = recoverTypedMessage(
          {
            data: typedData as any,
            sig: result.result,
          },
          'V3',
        );

        if (recovered.toLowerCase() === publicAddress?.toLowerCase()) {
          return this.console(`sign typed message v3 => true, Singature: ${result.result} Recovered signer: ${publicAddress}`, result);
        }
        return this.console(`Failed to verify signer, got: ${recovered}`);
      },
    );
  }

  signTypedDataV4 = (): void => {
    const { chainId, publicAddress } = this.state;
    const { web3 } = web3Obj;
    const typedData = getV4TypedData(chainId);
    (web3.currentProvider as any)?.send(
      {
        method: 'eth_signTypedData_v4',
        params: [publicAddress, JSON.stringify(typedData)],
        jsonrpc: '2.0',
      },
      (err: Error, result: any) => {
        if (err) {
          return console.error(err);
        }
        const recovered = recoverTypedMessage(
          {
            data: typedData as any,
            sig: result.result,
          },
          'V4',
        );

        if (recovered.toLowerCase() === publicAddress.toLowerCase()) {
          return this.console('sign typed message v4 => true', result.result, `Recovered signer: ${publicAddress}`, result);
        }
        return this.console(`Failed to verify signer, got: ${recovered}`);
      },
    );
  }

  console = (...args: any[]): void => {
    const el = document.querySelector('#console>p');
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  sendClvEthereum = async (): Promise<void> => {
    try {
      const { publicAddress } = this.state;
      const { web3 } = web3Obj;

      const instance = new web3.eth.Contract(tokenAbi, '0x654F17eAB141F47Ee882CA762dcFDEFA9EefD237');
      const balance = await instance.methods.balanceOf(publicAddress).call();
      console.log(balance, 'clv eth balance');
      const value = Math.floor(parseFloat('0.01') * 10 ** parseFloat('18')).toString();
      if (Number(balance) < Number(value)) {
        // eslint-disable-next-line no-alert
        window.alert('You do not have enough CLV tokens for transfer');
        return;
      }
      instance.methods.transfer(publicAddress, value).send(
        {
          from: publicAddress,
        },
        (err: Error, hash: string) => {
          if (err) this.console(err);
          else this.console(hash);
        },
      );
    } catch (error) {
      console.error(error);
    }
  }

  approveClvEthereum = async (): Promise<void> => {
    try {
      const { chainId, publicAddress } = this.state;
      const { web3 } = web3Obj;
      console.log(chainId, 'current chain id');

      const instance = new web3.eth.Contract(tokenAbi, '0x654F17eAB141F47Ee882CA762dcFDEFA9EefD237');
      let value = Math.floor(parseFloat('0.01') * 10 ** parseFloat('18')).toString();
      const allowance = await instance.methods.allowance(publicAddress, '0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3').call();
      console.log(allowance, 'current allowance');
      if (Number(allowance) > 0) value = '0';
      instance.methods.approve('0x3E2a1F4f6b6b5d281Ee9a9B36Bb33F7FBf0614C3', value).send(
        {
          from: publicAddress,
        },
        (err: Error, hash: string) => {
          if (err) this.console(err);
          else this.console(hash);
        },
      );
    } catch (error) {
      console.error(error);
    }
  }

  signPersonalMsg = async () : Promise<void> => {
    try {
      const { web3 } = web3Obj;
      const { publicAddress } = this.state;
      const message = 'Some string';
      const hash = web3.utils.sha3(message) as string;
      const sig = await web3.eth.personal.sign(hash, publicAddress, '');
      const hostnamealAddress = await web3.eth.personal.ecRecover(hash, sig);
      if (publicAddress.toLowerCase() === hostnamealAddress.toLowerCase()) this.console('Success');
      else this.console('Failed');
    } catch (error) {
      console.error(error);
      this.console('failed');
    }
  }

  
  stringifiableToHex = (value: any): string => ethers.utils.hexlify(Buffer.from(JSON.stringify(value)))

  logout = (): void => {
    clvInject.cleanUp()
      .then(() => {
        this.setState({
          publicAddress: '',
          solAddress: '',
          polkadotAddress: '',
        });
        return undefined;
      })
      .catch(console.error);
  }

  getLoginButton = () => {
    const { publicAddress, solAddress, polkadotAddress } = this.state;
    return <div>
      {
        !publicAddress && !solAddress && !polkadotAddress  && <button onClick={this.onlylogin}>Login</button>
      }
      {
        !publicAddress && !solAddress && !polkadotAddress  && <button onClick={this.solanaLogin}>Solana Login</button>
      }
      {
        !publicAddress && !solAddress && !polkadotAddress && <button onClick={this.polkadotLogin}>Polkadot Login</button>
      }
      {
        (publicAddress || solAddress || polkadotAddress) && <button onClick={this.logout}>Logout</button>
      }
    </div>
  }

  sendSolana = async () => {
    const { solAddress } = this.state;
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl('mainnet-beta'),
      'confirmed',
    );
    const fromPubkey = new solanaWeb3.PublicKey(solAddress);
    const toPubkey = new solanaWeb3.PublicKey(solAddress);
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: solanaWeb3.LAMPORTS_PER_SOL * 0,
      }),
    );

    const block = await connection.getRecentBlockhash('max');
    transaction.recentBlockhash = block.blockhash;
    transaction.setSigners(fromPubkey);

    const sss = await clvInject.clover_solana.signTransaction(transaction);
    const rawTransaction = sss.serialize();
    const a = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'single',
    });

    this.console('transaction hash:' + a);
  }

  sendSolanaAll = async () => {
    const { solAddress } = this.state;
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl('mainnet-beta'),
      'confirmed',
    );
    const fromPubkey = new solanaWeb3.PublicKey(solAddress);
    const toPubkey = new solanaWeb3.PublicKey(solAddress);
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: solanaWeb3.LAMPORTS_PER_SOL * 0,
      }),
    );

    const block = await connection.getRecentBlockhash('max');
    transaction.recentBlockhash = block.blockhash;
    transaction.setSigners(fromPubkey);

    const sss = await clvInject.clover_solana.signAllTransactions([transaction]);
    const rawTransaction = sss[0].serialize();
    const a = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'single',
    });

    this.console('transaction hash:' + a);
  }

  polkadotSignMessage = async () => {
    const { polkadotAddress } = this.state;
    const wrapped = u8aWrapBytes(polkadotAddress.toLowerCase());
    const ret = await currentInjected.signer.signRaw({
      data: u8aToHex(wrapped),
      address: polkadotAddress,
      type: "bytes",
    });
    // const ret = await currentInjected.sign.signMessage({
    //   data: u8aToHex(wrapped),
    //   address: polkadotAddress,
    //   type: "bytes",
    // });
    this.console('Polkadot signature:' + JSON.stringify(ret));
  }

  polkadotSignTransaction = async () => {
    const { polkadotAddress } = this.state;
    const currentClvAccount = polkadotAddress
    const injected = await web3FromAddress(currentClvAccount)
    api.getApi().setSigner(injected.signer)
    const unsub = await api.getApi().tx.balances
      .transfer(currentClvAccount, 0)
      .signAndSend(currentClvAccount, (result) => {
        this.console('Current status is:' + result.status);

        if (result.status.isInBlock) {
          this.console('Transaction included at blockHash:' + result.status.asInBlock);
        } else if (result.status.isFinalized) {
          this.console('Transaction finalized at blockHash:' + result.status.asFinalized);
          unsub();
        }
      })
  }

  render() {
    const { publicAddress, solAddress, polkadotAddress } = this.state;
    return (
      <div className="App">
        <div>
          <h3>Login With Clover Web Wallet</h3>
          <section>
            {
              this.getLoginButton()
            }
          </section>
          {
            publicAddress && (
              <section
                style={{
                  fontSize: '12px',
                }}
              >
                <section>
                  <div>
                    Public Address:
                    <i>{publicAddress.toString()}</i>
                  </div>
                </section>

                <section style={{ marginTop: '20px' }}>
                  <h4>Blockchain Apis</h4>
                  <section>
                    <h5>Signing</h5>
                    <button onClick={this.signPersonalMsg}>personal_sign</button>
                    <button onClick={this.signMessage}>sign_eth</button>
                    <button onClick={this.signTypedDataV1}>sign typed data v1</button>
                    <button onClick={this.signTypedDataV3}>sign typed data v3</button>
                    <button onClick={this.signTypedDataV4}>sign typed data v4</button>
                  </section>
                  <section>
                    <h5>Transactions</h5>
                    <button onClick={this.sendEth}>Send Eth</button>
                    <button onClick={this.sendClvEthereum}>Send CLV Ethereum</button>
                    {/* <button onClick={this.approveClvEthereum}>Approve CLV Ethereum</button> */}
                  </section>
                </section>
              </section>
            )
          }
          {
            solAddress && (
              <section
                style={{
                  fontSize: '12px',
                }}
              >
                <section>
                  <div>
                    Solana Address:
                    <i>{solAddress.toString()}</i>
                  </div>
                </section>
                <section style={{ marginTop: '20px' }}>
                  <h4>Solana Signing</h4>
                  <section>
                    <button onClick={this.sendSolana}>sign and send transaction</button>
                    <button onClick={this.sendSolanaAll}>sign all transactions and send the first</button>
                  </section>
                </section>
              </section>
            )
          }
          {
            polkadotAddress && (
              <section
                style={{
                  fontSize: '12px',
                }}
              >
                <section>
                  <div>
                    polkadot Address:
                    <i>{polkadotAddress.toString()}</i>
                  </div>
                </section>
                <section style={{ marginTop: '20px' }}>
                  <h4>polkadot Signing</h4>
                  <section>
                    <button onClick={this.polkadotSignMessage}>sign Message</button>
                    <button onClick={this.polkadotSignTransaction}>sign transaction</button>
                  </section>
                </section>
              </section>
            )
          }
        </div>
        {
          (publicAddress || solAddress || polkadotAddress) && (
            <div id="console" style={{ whiteSpace: 'pre-line' }}>
              <p style={{ whiteSpace: 'pre-line' }} />
            </div>
          )
        }
      </div>
    );
  }
}

export default App;
