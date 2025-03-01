import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { heliusApi, Webhook } from "../api";
import { ensureConfig } from "../config";

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

export default registerWebhookCommands;
