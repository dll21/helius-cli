import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import inquirer from "inquirer";
import chalk from "chalk";
import dotenv from "dotenv";

// Load environment variables from .env file if present
dotenv.config();

// Define the type for our configuration
interface ConfigType {
  apiKey: string;
  baseUrl: string;
}

// Default configuration
const defaultConfig: ConfigType = {
  apiKey: process.env.HELIUS_API_KEY || "",
  baseUrl: process.env.HELIUS_BASE_URL || "https://api.helius.xyz/v0",
};

// Path to the config file
const CONFIG_DIR = path.join(os.homedir(), ".helius-cli");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Load configuration
function loadConfig(): ConfigType {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configData = fs.readFileSync(CONFIG_PATH, "utf8");
      return { ...defaultConfig, ...JSON.parse(configData) };
    }
  } catch (error) {
    console.error("Error loading config:", error);
  }
  return { ...defaultConfig };
}

// Save configuration
function saveConfig(config: ConfigType): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

// Current configuration
let currentConfig = loadConfig();

/**
 * Ensures that the configuration has all required values
 * @returns {Promise<boolean>} True if configuration is valid
 */
export async function ensureConfig(): Promise<boolean> {
  const missingValues: string[] = [];

  if (!currentConfig.apiKey) missingValues.push("apiKey");

  if (missingValues.length === 0) {
    return true;
  }

  console.log(
    chalk.yellow("Some configuration values are missing. Let's set them up:")
  );

  interface AnswerType {
    apiKey?: string;
  }

  const questions = [];

  if (!currentConfig.apiKey) {
    questions.push({
      type: "input",
      name: "apiKey",
      message: "Enter your Helius API key:",
      validate: (input: string) =>
        input.trim() !== "" ? true : "API key cannot be empty",
    });
  }

  const answers = await inquirer.prompt<AnswerType>(questions);

  // Update config with new values
  currentConfig = {
    ...currentConfig,
    ...answers,
  };

  // Save the updated config
  saveConfig(currentConfig);

  console.log(chalk.green("Configuration updated successfully!"));
  return true;
}

/**
 * Gets the current configuration
 * @returns {ConfigType} The current configuration
 */
export function getConfig(): ConfigType {
  return { ...currentConfig };
}

/**
 * Sets a configuration value
 * @param {keyof ConfigType} key The configuration key
 * @param {string} value The value to set
 */
export function setConfig(key: keyof ConfigType, value: string): void {
  currentConfig[key] = value;
  saveConfig(currentConfig);
}

/**
 * Resets the configuration to default values
 */
export function resetConfig(): void {
  currentConfig = { ...defaultConfig };
  saveConfig(currentConfig);
}

export default {
  ensureConfig,
  getConfig,
  setConfig,
  resetConfig,
};
