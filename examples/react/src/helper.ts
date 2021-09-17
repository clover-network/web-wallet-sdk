import Web3 from 'web3';

type Web3Object = {
  web3: Web3;
  setClvWeb3: (provider: any) => void
};
const web3Obj: Web3Object = {
  web3: new Web3(),
  setClvWeb3(provider): void {
    web3Obj.web3.setProvider(provider);
  },
};

export default web3Obj;
