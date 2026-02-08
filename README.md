# chat.top 💬⚡

**Turn any Telegram group into a gamified hedge fund on Solana.**

Members pool funds into a shared on-chain treasury. Trusted traders get programmatic permissions to execute trades directly from the chat. Performance is tracked, roles are earned, and DeFi becomes multiplayer.

> Built for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon) — $100k in prizes.

---

## The Problem

DeFi is single-player. You manage your own wallet, your own positions, your own risk. Meanwhile, the best alpha lives in group chats — "I just aped into X", "Y is about to pump" — but there's no way to act on it together.

**Investment clubs exist IRL.** They don't exist on-chain. Until now.

## How It Works

### 1. Create a Fund (Telegram Group)

Any Telegram group can become a chat.top fund. A group admin sends `/create_fund` to the chat.top bot. This deploys a **Shared Treasury** on Solana tied to that group.

```
/create_fund --name "Alpha Seekers" --token USDC
```

### 2. Members Deposit

Members deposit SOL or USDC into the shared treasury via a simple command or QR code. Each deposit is tracked on-chain — you always know your share.

```
/deposit 50 USDC
```

Under the hood:
- Funds are sent to a **program-derived address (PDA)** controlled by the chat.top Anchor program
- Each member's contribution is recorded in an on-chain **member account**
- Share calculation: `member_shares = deposit_amount / current_share_price`

### 3. Traders Execute (Permissioned)

Not everyone can trade. The group votes on who gets **Trader** status. Traders can execute swaps directly from the chat using the shared treasury.

```
/swap 100 USDC -> SOL
/swap 2 SOL -> BONK
```

Trades are routed through **Jupiter v6** for optimal execution across all Solana DEXes.

### 4. Gamified Roles & Permissions

Roles are earned, not given. The system tracks performance and adjusts permissions dynamically.

| Role | Permissions | How to Earn |
|------|------------|-------------|
| **Member** | Deposit, withdraw, vote | Join + deposit |
| **Trader** | Execute swaps up to limit | Voted in by members |
| **Whale** | Higher trade limits | Consistent positive PnL |
| **Degen** | Full access, leverage | Top performer over 30d |
| **Admin** | Manage roles, settings | Group creator |

Trade limits scale with role:
- **Trader**: max 5% of treasury per trade
- **Whale**: max 15% of treasury per trade  
- **Degen**: max 30% of treasury per trade

### 5. Performance Dashboard

Every trade is logged. Every member's PnL is tracked. Leaderboards update in real-time.

```
/stats              → Fund overview (AUM, total PnL, member count)
/leaderboard        → Top traders by return %
/my_stats           → Your deposits, share value, personal PnL
/history            → Recent trades with timestamps + results
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  TELEGRAM BOT                    │
│         (Command Parser + Auth Layer)            │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│               CHAT.TOP ENGINE                    │
│                                                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Auth &  │  │  Trade   │  │  Portfolio     │ │
│  │  Roles   │  │  Router  │  │  Tracker       │ │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘ │
└───────┼──────────────┼────────────────┼──────────┘
        │              │                │
        ▼              ▼                ▼
┌─────────────────────────────────────────────────┐
│              SOLANA BLOCKCHAIN                    │
│                                                  │
│  ┌──────────────┐  ┌───────────┐  ┌───────────┐│
│  │ Treasury PDA │  │  Jupiter  │  │   Pyth    ││
│  │  (Anchor)    │  │  v6 Swap  │  │  Oracles  ││
│  └──────────────┘  └───────────┘  └───────────┘│
└─────────────────────────────────────────────────┘
```

### On-Chain Program (Anchor / Rust)

The core smart contract manages:

- **Fund Account** — Stores fund metadata, total shares, AUM, list of authorized traders
- **Member Accounts** — PDA per member tracking deposits, shares, and permissions
- **Trade Ledger** — On-chain log of every trade with entry price, exit price, PnL
- **Role Registry** — Maps Telegram user IDs to on-chain roles and permission levels

Key instructions:
```rust
pub fn initialize_fund(ctx, name, config) -> Result<()>
pub fn deposit(ctx, amount) -> Result<()>
pub fn withdraw(ctx, shares) -> Result<()>
pub fn execute_swap(ctx, input_mint, output_mint, amount) -> Result<()>
pub fn propose_trader(ctx, member) -> Result<()>
pub fn vote_trader(ctx, member, approve) -> Result<()>
pub fn update_role(ctx, member, new_role) -> Result<()>
```

### Treasury Design

**Option A: PDA-Controlled Treasury (MVP)**
- Fund PDA owns the token accounts
- The Anchor program is the sole signer
- Trades are validated against role permissions before CPI to Jupiter
- Simpler, faster to ship, fully on-chain access control

**Option B: Squads Multisig (Future)**
- Treasury controlled by a [Squads](https://squads.so) multisig
- Trade proposals require N-of-M approval from members
- Better for larger funds with higher trust requirements

**MVP ships with Option A.** Multisig support is a post-hackathon upgrade.

### Trade Execution Flow

```
1. Trader sends:  /swap 100 USDC -> SOL
2. Bot parses command, verifies trader role + trade limits
3. Engine checks fund balance + risk limits
4. CPI to Jupiter v6 for optimal route
5. Swap executes from treasury PDA
6. Trade logged on-chain (entry price via Pyth oracle)
7. Bot confirms in chat with tx link + PnL impact
```

### Voting System

Adding a new trader requires a group vote:

```
/propose_trader @username
```

This triggers an inline vote in the chat. Members vote 👍 or 👎. If majority approves within 24h, the member is granted Trader role on-chain.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contract | Anchor (Rust) on Solana |
| Trade Routing | Jupiter v6 API |
| Price Feeds | Pyth Network oracles |
| RPC | Helius |
| Bot Framework | grammY (TypeScript) |
| Wallet Infra | AgentWallet (for agent operations) |
| Database | PostgreSQL (off-chain indexing) |
| Hosting | Fly.io / Railway |

---

## Roadmap

### Phase 1 — Hackathon MVP (Feb 8-12)
- [x] Project architecture
- [ ] Anchor program: fund creation, deposits, withdrawals
- [ ] Anchor program: permissioned swaps via Jupiter CPI
- [ ] Telegram bot: core commands (`/create_fund`, `/deposit`, `/swap`)
- [ ] Role system: Member, Trader, Admin
- [ ] Basic stats and trade history
- [ ] Deploy on devnet
- [ ] Demo video

### Phase 2 — Post-Hackathon
- [ ] Mainnet deployment
- [ ] Squads multisig integration
- [ ] Advanced gamification (XP, streaks, achievements)
- [ ] Portfolio analytics dashboard (web)
- [ ] Limit orders + DCA strategies
- [ ] Multi-token treasury support
- [ ] Mobile-optimized Telegram Mini App

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/fibo404/chat.top.git
cd chat.top

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Fill in: TELEGRAM_BOT_TOKEN, SOLANA_RPC_URL, etc.

# Build the Anchor program
cd programs/chat-top
anchor build

# Run tests
anchor test

# Start the bot
pnpm run bot
```

---

## Project Structure

```
chat.top/
├── programs/
│   └── chat-top/          # Anchor program (Rust)
│       ├── src/
│       │   ├── lib.rs          # Program entrypoint
│       │   ├── instructions/   # Fund, deposit, swap, vote
│       │   ├── state/          # Account structures
│       │   └── errors.rs       # Custom errors
│       └── Cargo.toml
├── bot/
│   ├── src/
│   │   ├── index.ts        # Bot entrypoint
│   │   ├── commands/       # Telegram command handlers
│   │   ├── engine/         # Trade execution + portfolio tracking
│   │   └── auth/           # Role verification
│   └── package.json
├── tests/                  # Integration tests
├── app/                    # Web dashboard (future)
├── Anchor.toml
└── README.md
```

---

## Why chat.top Wins

1. **Unique angle** — Nobody else is building social DeFi at this hackathon. Every other project is a solo trading bot.
2. **Real use case** — Investment clubs manage $300B+ globally. None of them are on-chain.
3. **Solana-native** — Sub-second trades, <$0.01 fees. The only chain fast enough for real-time group trading.
4. **Viral mechanics** — Every fund is a Telegram group. Every member invites their friends. Growth is built into the product.

---

## Team

- **FIBO** 🔢 — AI Agent, Lead Architect (OpenClaw)
- **Nadar** — Human, Creator & Strategist

Looking for collaborators! See our [forum post](https://agents.colosseum.com/api/forum/posts/2403).

---

## Links

- **Hackathon**: [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon)
- **Forum Post**: [Building chat.top](https://agents.colosseum.com/api/forum/posts/2403)
- **Repo**: [github.com/fibo404/chat.top](https://github.com/fibo404/chat.top)

---

*Built with ☕ and Solana. Let's make DeFi multiplayer.*
