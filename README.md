# Helius CLI

A command-line interface for managing [Helius](https://helius.xyz) webhooks.

## Features

- Configure API key and base URL
- List all webhooks
- Get webhook details by ID
- Create new webhooks
- Delete webhooks
- More features coming soon!

## Installation

### Prerequisites

- Node.js 14 or higher
- npm or yarn

### Install from npm (Coming Soon)

```bash
npm install -g helius-cli
```

### Install from Source

1. Clone the repository:

```bash
git clone https://github.com/yourusername/helius-cli.git
cd helius-cli
```

2. Install dependencies:

```bash
npm install
```

3. Build the CLI:

```bash
npm run build
```

4. Link the CLI globally:

```bash
npm link
```

## Usage

### Initial Setup

Before using the CLI, you need to configure your Helius API key:

```bash
helius setup
```

This will prompt you to enter your Helius API key.

Alternatively, you can set the value manually:

```bash
helius config set apiKey YOUR_API_KEY
```

### Managing Webhooks

#### List all webhooks

```bash
helius webhooks list
```

#### Get webhook details by ID

```bash
helius webhooks get <webhookID>
```

#### Create a new webhook

You can create a webhook in interactive mode, which will guide you through the process:

```bash
helius webhooks create --interactive
```

Or you can specify all parameters directly:

```bash
helius webhooks create \
  --url "https://your-webhook-url.com" \
  --type "enhanced" \
  --types "NFT_SALE,SOL_TRANSFER" \
  --addresses "address1,address2" \
  --auth-header "your-auth-header" \
  --status "all"
```

Available options:
- `--url` or `-u`: Webhook URL (required for non-interactive mode)
- `--type` or `-t`: Webhook type (required for non-interactive mode) - One of: raw, rawDevnet, enhanced, enhancedDevnet, discord, discordDevnet
- `--types`: Transaction types to monitor (comma-separated, required for non-interactive mode) - See available types in interactive mode
- `--addresses`: Account addresses to monitor (comma-separated, required for non-interactive mode)
- `--auth-header` or `-a`: Authorization header (optional)
- `--status` or `-s`: Transaction status (optional) - One of: all, success, failed
- `--interactive`: Use interactive mode to create webhook (no other options required)

#### Delete a webhook

```bash
helius webhooks delete <webhookID>
```

You can skip the confirmation prompt by using the `--force` or `-f` flag:

```bash
helius webhooks delete <webhookID> --force
```

### Configuration

#### Show current configuration

```bash
helius config show
```

#### Set configuration values

```bash
helius config set apiKey YOUR_API_KEY
helius config set baseUrl https://api.helius.xyz/v0
```

#### Reset configuration

```bash
helius config reset
```

## Environment Variables

You can also configure the CLI using environment variables:

- `HELIUS_API_KEY`: Your Helius API key
- `HELIUS_BASE_URL`: The Helius API base URL (defaults to https://api.helius.xyz/v0)

## License

ISC 