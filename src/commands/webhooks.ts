import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { heliusApi, Webhook } from "../api";
import { ensureConfig } from "../config";

// Define available transaction types
const TRANSACTION_TYPES = [
  "ANY",
  "NFT_SALE",
  "NFT_LISTING",
  "NFT_CANCEL_LISTING",
  "NFT_MINT",
  "NFT_AUCTION_CREATED",
  "NFT_BID",
  "NFT_AUCTION_COMPLETE",
  "SWAP",
  "SWAP_SOL",
  "SWAP_TOKEN",
  "TOKEN_MINT",
  "TOKEN_BURN",
  "TOKEN_TRANSFER",
  "SOL_TRANSFER",
  "STAKE",
  "STAKE_DELEGATION",
  "UNSTAKE",
  "VOTE",
  "UNKNOWN",
];

// Define available webhook types
const WEBHOOK_TYPES = [
  "raw",
  "rawDevnet",
  "enhanced",
  "enhancedDevnet",
  "discord",
  "discordDevnet",
];

// Define available transaction status options
const TXN_STATUS_OPTIONS = ["all", "success", "failed"];

/**
 * Format webhook data for display
 * @param webhook Webhook data
 * @returns Formatted string
 */
function formatWebhook(webhook: Webhook): string {
  return `
${chalk.bold("ID:")} ${webhook.webhookID}
${chalk.bold("URL:")} ${webhook.webhookURL}
${chalk.bold("Type:")} ${webhook.webhookType}
${chalk.bold("Transaction Types:")} ${webhook.transactionTypes.join(", ")}
${chalk.bold("Account Addresses:")} ${
    webhook.accountAddresses.length
      ? webhook.accountAddresses.join(", ")
      : "None"
  }
${
  webhook.txnStatus
    ? `${chalk.bold("Transaction Status:")} ${webhook.txnStatus.join(", ")}`
    : ""
}
${webhook.encoding ? `${chalk.bold("Encoding:")} ${webhook.encoding}` : ""}
${
  webhook.encoding_config
    ? `${chalk.bold("Encoding Config:")} Format: ${
        webhook.encoding_config.format
      }, Compression: ${webhook.encoding_config.compression}`
    : ""
}
${
  webhook.authHeader
    ? `${chalk.bold("Auth Header:")} ${webhook.authHeader}`
    : ""
}
`;
}

/**
 * Register webhook commands
 * @param program Commander program
 */
export function registerWebhookCommands(program: Command): void {
  const webhooks = program
    .command("webhooks")
    .description("Manage Helius webhooks");

  // List all webhooks
  webhooks
    .command("list")
    .description("List all webhooks")
    .action(async () => {
      try {
        // Ensure configuration is set
        await ensureConfig();

        const spinner = ora("Fetching webhooks...").start();

        const webhooks = await heliusApi.getAllWebhooks();

        spinner.succeed(`Found ${webhooks.length} webhooks`);

        if (webhooks.length === 0) {
          console.log(chalk.yellow("No webhooks found."));
          return;
        }

        webhooks.forEach((webhook, index) => {
          console.log(chalk.green(`\n--- Webhook ${index + 1} ---`));
          console.log(formatWebhook(webhook));
        });
      } catch (error) {
        console.error(
          chalk.red("Error fetching webhooks:"),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  // Get webhook by ID
  webhooks
    .command("get <webhookID>")
    .description("Get webhook by ID")
    .action(async (webhookID: string) => {
      try {
        // Ensure configuration is set
        await ensureConfig();

        const spinner = ora(`Fetching webhook ${webhookID}...`).start();

        const webhook = await heliusApi.getWebhook(webhookID);

        spinner.succeed(`Found webhook ${webhookID}`);
        console.log(formatWebhook(webhook));
      } catch (error) {
        console.error(
          chalk.red("Error fetching webhook:"),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  // Create a new webhook
  webhooks
    .command("create")
    .description("Create a new webhook")
    .option(
      "-u, --url <url>",
      "Webhook URL (required for non-interactive mode)"
    )
    .option(
      "-t, --type <type>",
      "Webhook type (required for non-interactive mode)"
    )
    .option("-a, --auth-header <header>", "Authorization header")
    .option(
      "-s, --status <status>",
      "Transaction status (all, success, failed)"
    )
    .option("--types <types>", "Transaction types (comma-separated list)")
    .option(
      "--addresses <addresses>",
      "Account addresses to monitor (comma-separated list)"
    )
    .option("--interactive", "Use interactive mode to create webhook")
    .action(async (options) => {
      try {
        // Ensure configuration is set
        await ensureConfig();

        let webhookData: Omit<Webhook, "webhookID">;

        if (options.interactive) {
          // Interactive mode
          webhookData = await promptForWebhookData();
        } else {
          // Command line mode
          if (!options.url) {
            console.error(
              chalk.red(
                "Error: Webhook URL is required for non-interactive mode"
              )
            );
            console.log("Use --url option or --interactive mode");
            process.exit(1);
          }

          if (!options.type) {
            console.error(
              chalk.red(
                "Error: Webhook type is required for non-interactive mode"
              )
            );
            console.log("Use --type option or --interactive mode");
            process.exit(1);
          }

          if (!options.types) {
            console.error(
              chalk.red(
                "Error: Transaction types are required for non-interactive mode"
              )
            );
            console.log("Use --types option or --interactive mode");
            process.exit(1);
          }

          if (!options.addresses) {
            console.error(
              chalk.red(
                "Error: Account addresses are required for non-interactive mode"
              )
            );
            console.log("Use --addresses option or --interactive mode");
            process.exit(1);
          }

          // Parse transaction types
          const transactionTypes = options.types
            .split(",")
            .map((t: string) => t.trim().toUpperCase());

          // Validate transaction types
          for (const type of transactionTypes) {
            if (!TRANSACTION_TYPES.includes(type)) {
              console.error(
                chalk.red(`Error: Invalid transaction type: ${type}`)
              );
              console.log(`Valid types are: ${TRANSACTION_TYPES.join(", ")}`);
              process.exit(1);
            }
          }

          // Parse account addresses
          const accountAddresses = options.addresses
            .split(",")
            .map((a: string) => a.trim());

          // Validate webhook type
          if (!WEBHOOK_TYPES.includes(options.type)) {
            console.error(
              chalk.red(`Error: Invalid webhook type: ${options.type}`)
            );
            console.log(`Valid types are: ${WEBHOOK_TYPES.join(", ")}`);
            process.exit(1);
          }

          // Validate transaction status if provided
          if (options.status && !TXN_STATUS_OPTIONS.includes(options.status)) {
            console.error(
              chalk.red(`Error: Invalid transaction status: ${options.status}`)
            );
            console.log(`Valid options are: ${TXN_STATUS_OPTIONS.join(", ")}`);
            process.exit(1);
          }

          webhookData = {
            webhookURL: options.url,
            webhookType: options.type,
            transactionTypes,
            accountAddresses,
            authHeader: options.authHeader,
            txnStatus: options.status ? [options.status] : undefined,
          };
        }

        const spinner = ora("Creating webhook...").start();

        const webhook = await heliusApi.createWebhook(webhookData);

        spinner.succeed("Webhook created successfully");
        console.log(formatWebhook(webhook));
      } catch (error) {
        console.error(
          chalk.red("Error creating webhook:"),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

  // Delete webhook by ID
  webhooks
    .command("delete <webhookID>")
    .description("Delete webhook by ID")
    .option("-f, --force", "Skip confirmation prompt")
    .action(async (webhookID: string, options) => {
      try {
        // Ensure configuration is set
        await ensureConfig();

        // Confirm deletion unless force option is used
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message: `Are you sure you want to delete webhook ${webhookID}?`,
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.yellow("Deletion cancelled"));
            return;
          }
        }

        const spinner = ora(`Deleting webhook ${webhookID}...`).start();

        const result = await heliusApi.deleteWebhook(webhookID);

        if (result.success) {
          spinner.succeed(`Successfully deleted webhook ${webhookID}`);
        } else {
          spinner.fail(`Failed to delete webhook ${webhookID}`);
        }
      } catch (error) {
        console.error(
          chalk.red("Error deleting webhook:"),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });
}

/**
 * Prompt user for webhook data in interactive mode
 * @returns Webhook data
 */
async function promptForWebhookData(): Promise<Omit<Webhook, "webhookID">> {
  console.log(chalk.bold("\nCreate a new webhook:"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "webhookURL",
      message: "Enter the webhook URL:",
      validate: (input) =>
        input.trim() !== "" ? true : "Webhook URL is required",
    },
    {
      type: "list",
      name: "webhookType",
      message: "Select the webhook type:",
      choices: WEBHOOK_TYPES,
    },
    {
      type: "input",
      name: "authHeader",
      message: "Enter an authorization header (optional):",
    },
    {
      type: "list",
      name: "txnStatus",
      message: "Select transaction status to monitor:",
      choices: [...TXN_STATUS_OPTIONS, "Skip (don't filter by status)"],
      default: "all",
    },
    {
      type: "checkbox",
      name: "transactionTypes",
      message: "Select transaction types to monitor:",
      choices: TRANSACTION_TYPES,
      validate: (input) =>
        input.length > 0 ? true : "At least one transaction type is required",
    },
    {
      type: "input",
      name: "accountAddresses",
      message: "Enter account addresses to monitor (comma-separated):",
      validate: (input) =>
        input.trim() !== "" ? true : "At least one account address is required",
      filter: (input) => input.split(",").map((a: string) => a.trim()),
    },
  ]);

  // Handle txnStatus special case
  const txnStatus =
    answers.txnStatus === "Skip (don't filter by status)"
      ? undefined
      : [answers.txnStatus];

  return {
    webhookURL: answers.webhookURL,
    webhookType: answers.webhookType,
    authHeader: answers.authHeader || undefined,
    txnStatus,
    transactionTypes: answers.transactionTypes,
    accountAddresses: answers.accountAddresses,
  };
}

export default registerWebhookCommands;
