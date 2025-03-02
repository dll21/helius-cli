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
  "TRANSFER",
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
    ? `${chalk.bold("Transaction Status:")} ${webhook.txnStatus}`
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
    .option(
      "--collection <collectionAddress>",
      "NFT collection address to track all NFTs from"
    )
    .option("--interactive", "Use interactive mode to create webhook")
    .action(async (options) => {
      try {
        // Ensure configuration is set
        await ensureConfig();

        let webhookData: Omit<Webhook, "webhookID">;
        let accountAddresses: string[] = [];

        // Process collection address if provided
        if (options.collection) {
          const spinner = ora(
            `Fetching NFTs from collection ${options.collection}...`
          ).start();

          try {
            const nftAddresses = await heliusApi.getNftAddressesFromCollection(
              options.collection
            );
            spinner.succeed(
              `Found ${nftAddresses.length} NFTs in collection ${options.collection}`
            );

            if (nftAddresses.length === 0) {
              console.log(
                chalk.yellow(
                  "No NFTs found in the collection. Please check the collection address."
                )
              );
            } else {
              // Ask for confirmation before adding all NFT addresses
              const { confirm } = await inquirer.prompt([
                {
                  type: "confirm",
                  name: "confirm",
                  message: `Do you want to add ${nftAddresses.length} NFT addresses from this collection to your webhook?`,
                  default: true,
                },
              ]);

              if (confirm) {
                accountAddresses = nftAddresses;
                console.log(
                  chalk.green(
                    `Added ${nftAddresses.length} NFT addresses to the webhook.`
                  )
                );
              } else {
                console.log(chalk.yellow("NFT addresses not added."));
              }
            }
          } catch (error) {
            spinner.fail(
              `Failed to fetch NFTs from collection: ${
                error instanceof Error ? error.message : error
              }`
            );
            console.log(chalk.yellow("Continuing without collection NFTs..."));
          }
        }

        if (options.interactive) {
          // Interactive mode
          webhookData = await promptForWebhookData(accountAddresses);
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

          // If we have addresses from the collection, use them
          // Otherwise, require addresses from command line
          if (accountAddresses.length === 0) {
            if (!options.addresses) {
              console.error(
                chalk.red(
                  "Error: Account addresses are required for non-interactive mode"
                )
              );
              console.log(
                "Use --addresses option, --collection option, or --interactive mode"
              );
              process.exit(1);
            }

            // Parse account addresses from command line
            accountAddresses = options.addresses
              .split(",")
              .map((a: string) => a.trim());
          } else if (options.addresses) {
            // If we have both collection addresses and command line addresses, merge them
            const additionalAddresses = options.addresses
              .split(",")
              .map((a: string) => a.trim());

            accountAddresses = [...accountAddresses, ...additionalAddresses];
            console.log(
              chalk.green(
                `Added ${additionalAddresses.length} additional addresses from command line.`
              )
            );
          }

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
            txnStatus: options.status ? options.status : undefined,
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
 * @param prefilledAddresses Optional array of addresses to prefill
 * @returns Webhook data
 */
async function promptForWebhookData(
  prefilledAddresses: string[] = []
): Promise<Omit<Webhook, "webhookID">> {
  console.log(chalk.bold("\nCreate a new webhook:"));

  // Prepare basic questions
  const basicQuestions: any[] = [
    {
      type: "input",
      name: "webhookURL",
      message: "Enter the webhook URL:",
      validate: (input: string) =>
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
      validate: (input: any) =>
        input.length > 0 ? true : "At least one transaction type is required",
    },
  ];

  // Get basic information first
  const basicAnswers = await inquirer.prompt(basicQuestions);

  // Handle collection address if no addresses are prefilled
  let useCollection = false;
  let collectionAddress = "";

  if (prefilledAddresses.length === 0) {
    const collectionQuestion = await inquirer.prompt([
      {
        type: "confirm",
        name: "useCollection",
        message: "Do you want to track NFTs from a collection?",
        default: false,
      },
    ]);

    useCollection = collectionQuestion.useCollection;

    if (useCollection) {
      const collectionAddressQuestion = await inquirer.prompt([
        {
          type: "input",
          name: "collectionAddress",
          message: "Enter the collection address:",
          validate: (input: string) =>
            input.trim() !== "" ? true : "Collection address is required",
        },
      ]);

      collectionAddress = collectionAddressQuestion.collectionAddress;
    }
  }

  // Process collection address if provided
  let accountAddresses = [...prefilledAddresses];
  let collectionAddressesAdded = false;

  if (useCollection && collectionAddress) {
    const spinner = ora(
      `Fetching NFTs from collection ${collectionAddress}...`
    ).start();

    try {
      const nftAddresses = await heliusApi.getNftAddressesFromCollection(
        collectionAddress
      );
      spinner.succeed(
        `Found ${nftAddresses.length} NFTs in collection ${collectionAddress}`
      );

      if (nftAddresses.length === 0) {
        console.log(
          chalk.yellow(
            "No NFTs found in the collection. Please check the collection address."
          )
        );
      } else {
        // Ask for confirmation before adding all NFT addresses
        const { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message: `Do you want to add ${nftAddresses.length} NFT addresses from this collection to your webhook?`,
            default: true,
          },
        ]);

        if (confirm) {
          accountAddresses = [...accountAddresses, ...nftAddresses];
          collectionAddressesAdded = true;
          console.log(
            chalk.green(
              `Added ${nftAddresses.length} NFT addresses from collection to the webhook.`
            )
          );
        } else {
          console.log(chalk.yellow("NFT addresses from collection not added."));
        }
      }
    } catch (error) {
      spinner.fail(
        `Failed to fetch NFTs from collection: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  // Ask for additional addresses
  const addressPromptMessage =
    prefilledAddresses.length > 0
      ? "Enter additional account addresses to monitor (comma-separated, optional):"
      : collectionAddressesAdded
      ? "Enter additional account addresses to monitor (comma-separated, optional):"
      : "Enter account addresses to monitor (comma-separated):";

  const addressRequired = !(
    prefilledAddresses.length > 0 || collectionAddressesAdded
  );

  const addressQuestion = await inquirer.prompt([
    {
      type: "input",
      name: "accountAddresses",
      message: addressPromptMessage,
      validate: (input: string) => {
        if (!addressRequired) {
          return true;
        }
        return input.trim() !== ""
          ? true
          : "At least one account address is required";
      },
      filter: (input: string) =>
        input ? input.split(",").map((a: string) => a.trim()) : [],
    },
  ]);

  // Add any additional addresses from the prompt
  if (
    addressQuestion.accountAddresses &&
    addressQuestion.accountAddresses.length > 0
  ) {
    accountAddresses = [
      ...accountAddresses,
      ...addressQuestion.accountAddresses,
    ];
    console.log(
      chalk.green(
        `Added ${addressQuestion.accountAddresses.length} additional addresses from input.`
      )
    );
  }

  // If we still have no addresses, prompt again
  if (accountAddresses.length === 0) {
    console.log(chalk.red("Error: At least one account address is required."));
    const { additionalAddresses } = await inquirer.prompt([
      {
        type: "input",
        name: "additionalAddresses",
        message: "Enter account addresses to monitor (comma-separated):",
        validate: (input) =>
          input.trim() !== ""
            ? true
            : "At least one account address is required",
        filter: (input) => input.split(",").map((a: string) => a.trim()),
      },
    ]);

    accountAddresses = additionalAddresses;
  }

  // Handle txnStatus special case
  const txnStatus =
    basicAnswers.txnStatus === "Skip (don't filter by status)"
      ? undefined
      : [basicAnswers.txnStatus];

  return {
    webhookURL: basicAnswers.webhookURL,
    webhookType: basicAnswers.webhookType,
    authHeader: basicAnswers.authHeader || undefined,
    txnStatus: basicAnswers.txnStatus,
    transactionTypes: basicAnswers.transactionTypes,
    accountAddresses,
  };
}

export default registerWebhookCommands;
