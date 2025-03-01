import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { getConfig, setConfig, resetConfig } from "../config";

/**
 * Register configuration commands
 * @param program Commander program
 */
export function registerConfigCommands(program: Command): void {
  const config = program
    .command("config")
    .description("Manage CLI configuration");

  // Show current configuration
  config
    .command("show")
    .description("Show current configuration")
    .action(() => {
      const currentConfig = getConfig();
      console.log(chalk.bold("\nCurrent Configuration:"));
      console.log(
        chalk.bold("API Key:"),
        currentConfig.apiKey || chalk.yellow("Not set")
      );
      console.log(chalk.bold("Base URL:"), currentConfig.baseUrl);
      console.log();
    });

  // Set configuration value
  config
    .command("set <key> <value>")
    .description("Set configuration value (apiKey, baseUrl)")
    .action((key: string, value: string) => {
      if (!["apiKey", "baseUrl"].includes(key)) {
        console.error(
          chalk.red(
            "Invalid configuration key. Valid keys are: apiKey, baseUrl"
          )
        );
        process.exit(1);
      }

      setConfig(key as any, value);
      console.log(
        chalk.green(
          `Configuration updated: ${key} = ${
            key === "apiKey" ? value.substring(0, 5) + "..." : value
          }`
        )
      );
    });

  // Reset configuration
  config
    .command("reset")
    .description("Reset configuration to defaults")
    .action(async () => {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message:
            "Are you sure you want to reset all configuration to defaults?",
          default: false,
        },
      ]);

      if (confirm) {
        resetConfig();
        console.log(chalk.green("Configuration reset to defaults"));
      } else {
        console.log(chalk.yellow("Reset cancelled"));
      }
    });
}

export default registerConfigCommands;
