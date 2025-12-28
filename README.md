# ZDAO - Confidential Voting Platform

A decentralized voting platform (DAO) using **Fully Homomorphic Encryption (FHE)** to ensure absolute security and privacy for votes. Built with Next.js, Solidity, and the FHEVM framework from Zama Protocol.

🌐 **[Live Demo](https://zdao-dev.vercel.app/)** - Try it out now!

## 📋 Overview

ZDAO enables users to:
- ✅ Create new proposals
- 🔐 Cast fully encrypted votes (Yes/No)
- 🔒 Ensure absolute privacy - no one can see your vote
- 📊 View statistics and analyze voting results
- 📜 Track your voting history
- 🌐 Make results public after the voting period ends

## ✨ Key Features

### 🔐 Security with FHE (Fully Homomorphic Encryption)
- All votes are encrypted using FHE before being sent to the blockchain
- Vote counting is performed on encrypted data
- Only the voter can decrypt their own vote
- Results are only made public when the proposal owner decides

### 🎨 User Interface
- Modern UI with cyberpunk theme
- Responsive design, supports mobile and desktop
- Dark mode with neon effects
- Sidebar navigation with tabs: Vote, Create, Analytics, History

### 📊 Analytics & Statistics
- Total proposals and total votes
- Charts analyzing voting results
- Personal voting history
- Pagination for proposal lists

### 🔗 Web3 Integration
- Connect MetaMask and compatible wallets
- Support for Sepolia testnet
- Automatic network switching when needed
- Wallet connection state management

## 🏗️ Project Architecture

```
zdao/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page
│   ├── layout.tsx         # Main layout
│   └── globals.css        # Global styles
├── components/             # React components
│   ├── voting/            # Voting components
│   ├── wallet/            # Wallet components
│   └── ui/                # UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
│   ├── useWeb3.ts         # Main Web3 integration hook
│   ├── useFHEOperations.ts # FHE operations hook
│   ├── useVoting.ts       # Voting logic hook
│   ├── useProposals.ts    # Proposals management hook
│   └── useWallet.ts       # Wallet management hook
├── smart-contracts/       # Smart contracts
│   ├── contracts/
│   │   └── ZDAO.sol       # Main contract
│   ├── deploy/            # Deployment scripts
│   └── test/              # Tests
└── lib/                   # Utilities
```

## 🚀 Installation

### Requirements
- Node.js >= 22
- pnpm >= 7.0.0 (or npm/yarn)
- MetaMask or compatible Web3 wallet

### Step 1: Clone repository

```bash
git clone <repository-url>
cd zdao
```

### Step 2: Install dependencies

```bash
# Install frontend dependencies
pnpm install

# Install smart contract dependencies
cd smart-contracts
npm install
cd ..
```

### Step 3: Environment configuration

Create a `.env.local` file in the root directory:

```env
# Wallet Configuration (optional - can use MetaMask)
PRIVATE_KEY=your_private_key_here

# Network RPC URLs
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_ZAMA_RPC_URL=https://devnet.zama.ai

# Zama Relayer Configuration
NEXT_PUBLIC_ZAMA_RELAYER_URL=https://relayer.zama.ai
```

### Step 4: Deploy Smart Contracts

```bash
cd smart-contracts

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Or deploy to localhost (for development)
npm run deploy:localhost
```

After deployment, copy the contract address and add it to `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### Step 5: Run the application

```bash
# From root directory
pnpm dev
```

The application will run at `http://localhost:3000`

## 📖 Usage Guide

### 1. Connect Wallet

1. Open the application in your browser
2. Click the "Connect Wallet" button
3. Select MetaMask or a compatible wallet
4. Approve the connection and switch to Sepolia network if needed

### 2. Create Proposal

1. Switch to the "Create" tab
2. Enter the proposal description
3. Click "Create Proposal"
4. Confirm the transaction in your wallet

### 3. Cast Vote

1. Switch to the "Vote" tab
2. Select the proposal you want to vote on
3. Click "Yes" or "No"
4. Confirm the transaction (your vote will be automatically encrypted)

### 4. View Results

- **Encrypted Results**: Displayed immediately after voting (only you can see your vote)
- **Public Results**: Proposal owner can make results public after voting ends
- **Analytics**: View overall statistics in the "Analytics" tab

### 5. Voting History

- The "History" tab displays all votes you have cast
- Click on a proposal to view details

## 🔧 Smart Contracts

### ZDAO.sol

Main contract managing proposals and voting.

#### Key Functions:

**Proposal Management:**
- `createProposal(string description)`: Create a new proposal
- `proposalCount()`: Get total number of proposals
- `proposals(uint256)`: Get proposal information

**Voting:**
- `vote(uint256 proposalId, externalEuint8 encryptedVote, bytes proof)`: Cast an encrypted vote
- `hasUserVoted(uint256 proposalId, address voter)`: Check if user has voted
- `getMyVote(uint256 proposalId)`: Get your vote (encrypted)

**Results:**
- `getEncryptedVoteCount(uint256 proposalId)`: Get encrypted vote counts
- `makeVoteCountsPublic(uint256 proposalId)`: Make results public (owner only)
- `getPublicVoteCounts(uint256 proposalId)`: Get public vote counts
- `submitDecryptedVoteCounts(...)`: Submit decrypted results

### Security Features

- ✅ FHE encryption for all votes
- ✅ Proof verification to ensure validity
- ✅ Each address can only vote once
- ✅ Votes cannot be changed after casting
- ✅ Only proposal owner can make results public

## 🧪 Testing

### Test Smart Contracts

```bash
cd smart-contracts
npm test
```

### Test Frontend

```bash
pnpm lint
```

## 🌐 Deployment

### Deploy Smart Contracts

```bash
cd smart-contracts

# Deploy to Sepolia
npm run deploy:sepolia

# Deploy to mainnet (when ready)
npm run deploy --network mainnet
```

### Deploy Frontend

```bash
# Build production
pnpm build

# Deploy to Vercel (recommended)
vercel deploy

# Or deploy to other platform
pnpm start
```

## 📚 Technologies Used

### Frontend
- **Next.js 16**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components
- **React Query**: Data fetching
- **Ethers.js**: Web3 interactions
- **@zama-fhe/relayer-sdk**: FHE operations

### Smart Contracts
- **Solidity ^0.8.20**: Smart contract language
- **FHEVM**: Fully Homomorphic Encryption framework
- **Hardhat**: Development environment
- **TypeChain**: TypeScript bindings

### Blockchain
- **Ethereum Sepolia**: Testnet
- **Zama Protocol**: FHE-enabled network

## 🔒 Security

### FHE (Fully Homomorphic Encryption)
- All votes are encrypted before being sent to the blockchain
- Computation is performed on encrypted data without decryption
- Only the voter can decrypt their own vote
- Aggregated results remain encrypted until made public

### Wallet Connection Errors
- Ensure MetaMask is installed
- Check network (must be Sepolia)
- Refresh the page and try again

### FHE Initialization Errors
- Check Zama Relayer URL in `.env.local`
- Ensure stable network connection
- Check console logs for debugging

### Transaction Errors
- Check balance in wallet (need Sepolia ETH)
- Ensure transaction is approved in MetaMask
- Check gas limit

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details.

## 🔗 Links

- 🌐 **[Live Demo](https://zdao-dev.vercel.app/)** - Try the application
- [Zama Protocol](https://zama.ai)
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)

## 👥 Authors

- ZDAO Team

## 🙏 Acknowledgments

- Zama Protocol team for the FHEVM framework
- Next.js team for the amazing framework
- Open source community

---

**Note**: This is a demo/testnet project. Do not use for production without a full security audit.
