// Command Index - Export all commands
import { 
  SlashCommandBuilder, 
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction
} from 'discord.js';
import startCommand from './start';
import linkCommand from './link';
import settingsCommand from './settings';
import premiumCommand from './premium';
import debugCommand from './debug';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands: Command[] = [
  startCommand,
  linkCommand,
  settingsCommand,
  premiumCommand,
  debugCommand
];

export { startCommand, linkCommand, settingsCommand, premiumCommand, debugCommand };
