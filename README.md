# Helius CLI

A command-line interface for managing [Helius](https://helius.xyz) webhooks.

## Features

- Configure API key and base URL
- List all webhooks
- Get webhook details by ID
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
helius webhooks get WEBHOOK_ID
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