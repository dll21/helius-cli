#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { registerWebhookCommands } from "./commands/webhooks";
import { registerConfigCommands } from "./commands/config";
import { ensureConfig } from "./config";

// Create the program
const program = new Command();

// Set up CLI metadata
program
  .name("helius")
  .description("CLI tool for managing Helius webhooks")
  .version("1.0.0");

// Register commands
registerWebhookCommands(program);
registerConfigCommands(program);

// Add a setup command
program
  .command("setup")
  .description("Set up CLI configuration")
  .action(async () => {
    try {
      await ensureConfig();
      console.log(chalk.green("Setup complete! You can now use the CLI."));
    } catch (error) {
      console.error(
        chalk.red("Error during setup:"),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

// Handle unknown commands
program.on("command:*", () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(" ")}`));
  console.error("See --help for a list of available commands.");
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length === 2) {
  program.outputHelp();
}
