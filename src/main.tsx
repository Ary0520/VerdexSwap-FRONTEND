import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { MetaMaskProvider } from '@metamask/sdk-react';
import { apolloClient } from './apolloClient';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MetaMaskProvider
      debug={false}
      sdkOptions={{
        logging: { developerMode: false },
        checkInstallationImmediately: false,
        dappMetadata: {
          name: 'VerdexSwap',
          url: window.location.host,
        },
      }}
    >
      <ApolloProvider client={apolloClient}>
        <App />
      </ApolloProvider>
    </MetaMaskProvider>
  </React.StrictMode>,
);
