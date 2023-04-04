import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
declare global {
  interface Window {
    solanaWalletAdapterWallets:any,
    solanaWeb3:any,
    ethereum:any,
    Web3:any
  }
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  inputValue = '';
  inputDisabled = false;
  outputValue = '';
  executing = false;

  constructor(private http: HttpClient) {}

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!this.executing) {
        this.executing = true;
        const command = this.inputValue;
        this.inputValue = '';

        if (command.toLowerCase() === 'clear') {
          this.outputValue = '';
          this.executing = false;
        } else {
          this.appendOutput(this.outputValue,'Execution in progress...', false);
          this.inputDisabled = true;

          this.http
            .post('http://localhost:3005/execute-command', { command }, { responseType: 'text' })
            .subscribe(
              (data) => {
                this.outputValue = this.outputValue.replace('Execution in progress...\n', '');
                this.appendOutput(this.outputValue,`${command}`, true);
                this.appendOutput(this.outputValue,data, false);
              },
              (error) => {
                this.outputValue = this.outputValue.replace('Execution in progress...\n', '');
                this.appendOutput(this.outputValue,`${command}\nError: ${error.message}`, true);
              },
              () => {
                this.inputDisabled = false;
                this.executing = false;
              }
            );
        }
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      if (this.executing) {
        this.appendOutput(this.outputValue,'Execution interrupted', false);
        this.inputDisabled = false;
        this.executing = false;
      }
    }
  }

  // appendOutput(text: string, isCommand: boolean) {
  //   this.outputValue += (isCommand ? '> ' : '') + text + '\n';
  // }
  appendOutput(output: any, text: string, addPrompt: boolean ) {
    if (addPrompt) {
        output.append(`$ ${text}\n`);
    } else {
        output.append(`${text}\n`);
    }
    output.scrollTop(output.prop("scrollHeight"));
  }

  executeScript(script: string, output: any) {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    // console.log = console.error = function (message) {
    //     this.appendOutput(output, message, false);
    // };
    const wrappedScript = `(async () => { ${script} })();`;

    try {
        eval(wrappedScript);
    } catch (error:any) {
        this.appendOutput(output, `Error: ${error.message} \n script ${script}`, false);
    }

    //console.log = originalConsoleLog;
    //console.error = originalConsoleError;
  }

  processServerResponse(data: string, output: any) {
    // Extract JavaScript code inside triple backticks, with or without the word "javascript"
    const codeRegex = /```(?:javascript)?\s*([\s\S]*?)\s*```/g;
    const codeMatch = codeRegex.exec(data);

    if (codeMatch) {
        const scriptContent = codeMatch[1].trim();
        this.executeScript(scriptContent, output);
    } else {
        this.appendOutput(output, `${data}`, false);
    }
  }

  public solanaNetwork = 'https://api.mainnet-beta.solana.com';
  public connection = new window.solanaWeb3.Connection(this.solanaNetwork);

  async _connectToPhantomWallet() {
      const wallet = window.solanaWalletAdapterWallets.getPhantomWallet();

      if (!wallet) {
          console.log('Please install Phantom Wallet to use this feature');
          return null;
      }

      if (wallet.connected) {
          console.log('You are already connected to Phantom Wallet');
          return wallet.publicKey.toBase58();
      }

      try {
          await wallet.connect();
          localStorage.setItem('solanaPublicKey', wallet.publicKey.toBase58());
          return wallet.publicKey.toBase58();
      } catch (error:any) {
          console.log('Failed to connect to Phantom Wallet: ' + error.message);
          return null;
      }
  }

  async _disconnectFromPhantomWallet() {
      const wallet = window.solanaWalletAdapterWallets.getPhantomWallet();

      if (!wallet) {
          console.log('Please install Phantom Wallet to use this feature');
          return null;
      }

      if (!wallet.connected) {
          console.log('You are already disconnected from Phantom Wallet');
          return null;
      }

      try {
          await wallet.disconnect();
          localStorage.removeItem('solanaPublicKey');
          console.log('You have successfully disconnected from Phantom Wallet');
          return true;
      } catch (error:any) {
          console.log('Failed to disconnect from Phantom Wallet: ' + error.message);
          return null;
      }
  }

  async  _getSolanaPublicKey() {
      const wallet = window.solanaWalletAdapterWallets.getPhantomWallet();

      if (!wallet) {
          console.log('Please install Phantom Wallet to use this feature');
          return null;
      }

      if (!wallet.connected) {
          console.log('You are not connected to Phantom Wallet');
          return null;
      }

      try {
          return wallet.publicKey.toBase58();
      } catch (error:any) {
          console.log('Failed to retrieve public key from Phantom Wallet: ' + error.message);
          return null;
      }
  }

  async  _getSolanaNetworkInfo() {
      const networkInfo = {
          rpcUrl: this.solanaNetwork,
          networkName: 'Solana Mainnet Beta'
      };

      return networkInfo;
  }

  async  _getSolanaBalance(address:any) {
      if (!address) {
          console.log('Invalid address');
          return null;
      }

      try {
          const publicKey = new window.solanaWeb3.PublicKey(address);
          const balance = await this.connection.getBalance(publicKey);
          const lamportsToSol = balance / 1e9;
          return lamportsToSol;
      } catch (error:any) {
          console.log('Failed to retrieve balance: ' + error.message);
          return null
      }
  }


  async  _connectToMetaMask() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      console.log('Please install MetaMask to use this feature');
      return null;
    }
  
    // Check if the wallet is already connected
    if (window.ethereum.selectedAddress !== null) {
      console.log('You are already connected to MetaMask');
      return window.ethereum.selectedAddress;
    }
  
    try {
      // Request permission to access the user's accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      // Save the selected account address to local storage
      localStorage.setItem('publicKey', accounts[0]);
      return accounts[0];
    } catch (error:any) {
      // Handle error gracefully
      console.log('Failed to connect to MetaMask: ' + error.message);
      return null;
    }
  }

  async  _disconnectFromMetaMask() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      console.log('Please install MetaMask to use this feature');
      return null;
    }
  
    // Check if the wallet is already disconnected
    if (!window.ethereum.selectedAddress) {
      console.log('You are already disconnected from MetaMask');
      return null;
    }
  
    try {
      // Disconnect from MetaMask
      await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      localStorage.removeItem('publicKey');
      console.log('You have successfully disconnected from MetaMask');
      return true;
    } catch (error:any) {
      // Handle error gracefully
      console.log('Failed to disconnect from MetaMask: ' + error.message);
      return null;
    }
  }
  

  // Get public key from MetaMask
async  _getPublicKey() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      console.log('Please install MetaMask to use this feature');
      return null;
    }
  
    // Check if the wallet is connected
    if (!window.ethereum.selectedAddress) {
      console.log('You are not connected to MetaMask');
      return null;
    }
  
    try {
      // Retrieve the public key from MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch (error:any) {
      // Handle error gracefully
      console.log('Failed to retrieve public key from MetaMask: ' + error.message);
      return null;
    }
  }
  
  // Get network information from MetaMask
  async  _getNetworkInfo() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      console.log('Please install MetaMask to use this feature');
      return null;
    }
  
    // Check if the wallet is connected
    if (!window.ethereum.selectedAddress) {
      console.log('You are not connected to MetaMask');
      return null;
    }
  
    try {
      // Retrieve the network information from MetaMask
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const networkId = await window.ethereum.request({ method: 'net_version' });
  
      let networkName;
      switch (chainId) {
        case '0x1':
          networkName = 'Mainnet';
          break;
        case '0x3':
          networkName = 'Ropsten Testnet';
          break;
        case '0x4':
          networkName = 'Rinkeby Testnet';
          break;
        case '0x5':
          networkName = 'Goerli Testnet';
          break;
        case '0x2a':
          networkName = 'Kovan Testnet';
          break;
        default:
          networkName = 'Unknown Network';
      }
  
      return {
        chainId: chainId,
        networkId: networkId,
        networkName: networkName
      };
    } catch (error:any) {
      // Handle error gracefully
      console.log('Failed to retrieve network information from MetaMask: ' + error.message);
      return null;
    }
  }
  
  async  _getBalance(address:any, type = 'ether') {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      console.log('Please install MetaMask to use this feature');
      return null;
    }
  
    // Check if the wallet is connected
    if (!window.ethereum.selectedAddress) {
      console.log('You are not connected to MetaMask');
      return null;
    }
  
    try {
      let balance;
  
      if (type === 'ether') {
        // Retrieve the balance in ether
        balance = await window.ethereum.request({ method: 'eth_getBalance', params: [address] });
        balance = window.Web3.utils.fromWei(balance, 'ether');
      } else {
        // Retrieve the balance of a specific token
        const ERC20_ABI:any={};
        const contract = new window.Web3.eth.Contract(ERC20_ABI, type);
        balance = await contract.methods.balanceOf(address).call();
        balance = window.Web3.utils.fromWei(balance, 'ether');
      }
  
      return balance;
    } catch (error:any) {
      // Handle error gracefully
      console.log('Failed to retrieve balance: ' + error.message);
      return null;
    }
  }
  

  async  _deployNewToken(supply:any, name:any) {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      console.log('Please install MetaMask to use this feature');
      return null;
    }
  
    // Check if the wallet is connected
    if (!window.ethereum.selectedAddress) {
      console.log('You are not connected to MetaMask');
      return null;
    }
  
    try {
      // Get the account address from MetaMask
      const account = await this._getPublicKey();
  
      // Create the token contract instance
      const ERC20_ABI:any={};
      const ERC20_BYTECODE:any={};
      const contract = new window.Web3.eth.Contract(ERC20_ABI);
  
      // Build the contract data
      const bytecode = ERC20_BYTECODE;
      const abi = ERC20_ABI;
      const contractData = contract.deploy({
        data: bytecode,
        arguments: [supply, name]
      }).encodeABI();
  
      // Get the gas price and estimate the transaction gas limit
      const gasPrice = await window.Web3.eth.getGasPrice();
      const gasLimit = await contract.deploy({
        data: bytecode,
        arguments: [supply, name]
      }).estimateGas({ from: account });
  
      // Create the transaction object
      const transaction = {
        from: account,
        gasPrice: gasPrice,
        gas: gasLimit,
        data: contractData
      };
  
      // Sign and send the transaction
      const signedTransaction = await window.ethereum.request({ method: 'eth_signTransaction', params: [transaction] });
      const transactionHash = await window.Web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
  
      // Get the deployed contract address
      const receipt = await window.Web3.eth.getTransactionReceipt(transactionHash);
      const contractAddress = receipt.contractAddress;
  
      return contractAddress;
    } catch (error:any) {
      // Handle error gracefully
      console.log('Failed to deploy new token: ' + error.message);
      return null;
    }
  }
  


  async  _getCryptoCurrencyPrice(cryptoName:any, date:any) {
     cryptoName = cryptoName.toLowerCase();
    // If no date is specified, use today's date
    if (!date) {
      date = new Date().toISOString().slice(0, 10);
    }
  
    // Construct the API URL
    const apiUrl = `https://api.coingecko.com/api/v3/coins/${cryptoName}/history?date=${date}`;
  
    // Fetch the data from the API
    const response = await fetch(apiUrl);
    const data = await response.json();
  
    // If the API returns an error, throw an error
    if (data.error) {
      throw new Error(data.error);
    }
  
    // Return the price in USD
    return data.market_data.current_price.usd;
  }
  
  async  _getCurrentCryptoCurrencyPrice(cryptoName:any) {
    cryptoName = cryptoName.toLowerCase();
    // Construct the API URL
    const apiUrl = `https://api.coingecko.com/api/v3/coins/${cryptoName}`;
  
    // Fetch the data from the API
    const response = await fetch(apiUrl);
    const data = await response.json();
  
    // If the API returns an error, throw an error
    if (data.error) {
      throw new Error(data.error);
    }
  
    // Return the current price in USD
    return data.market_data.current_price.usd;
  }
}
