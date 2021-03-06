import { ApplicationCommandOptionType, ApplicationCommandType, CacheType, Client, Interaction, InteractionType } from 'discord.js';
import { createSlashCommand } from '../library/backend.js';

export async function register ({ client }: { client: Client }): Promise<void> {
    await createSlashCommand(client, {
        type: ApplicationCommandType.ChatInput,
        name: 'echo',
        description: 'Replies by echoing your input',
        options: [
            {
                name: 'input',
                type: ApplicationCommandOptionType.String,
                description: 'The input to be echoed',
                required: true
            }
        ],
    });
}

export async function execute ({ interaction }: { interaction: Interaction<CacheType>}): Promise<boolean> {
    if (!(
        interaction.type === InteractionType.ApplicationCommand &&
        interaction.commandName === 'echo'
    )) return false;

    const input = interaction.options.get('input')?.value as string;

    console.debug(interaction);

    await interaction.reply({
        content: input,
        ephemeral: true
    });

    return true;
}
