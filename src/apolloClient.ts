import { ApolloClient, InMemoryCache } from '@apollo/client';

export const apolloClient = new ApolloClient({
  uri: 'https://api.studio.thegraph.com/query/1744252/verdex-arbitrum-sepolia/v0.0.3', // The testnet subgraph URL
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          pairs: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});
