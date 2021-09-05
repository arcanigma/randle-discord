import { ApplicationCommandData, Client, Interaction, MessageActionRowComponentResolvable, MessageActionRowOptions, MessageButton, Permissions, TextChannel, ThreadChannel } from 'discord.js';
import { MAX_ACTION_ROWS, MAX_BUTTON_LABEL, MAX_ROW_COMPONENTS } from '../constants';
import { registerSlashCommand } from '../library/backend';
import { itemize, trunc } from '../library/factory';
import { blame } from '../library/message';

export const register = ({ client }: { client: Client }): void => {

    client.on('ready', async () => {
        const slash: ApplicationCommandData = {
            name: 'poll',
            description: 'Create a poll',
            options: [
                {
                    name: 'prompt',
                    type: 'STRING',
                    description: 'A question or statement',
                    required: true
                },
                {
                    name: 'choices',
                    type: 'STRING',
                    description: 'A list of vote choices',
                    required: true
                },
            ]
        };

        await registerSlashCommand(slash, client);
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand() || interaction.commandName !== 'poll') return;

        if (!(interaction.channel instanceof TextChannel))
            throw `Unsupported channel <${interaction.channel?.toString() ?? 'undefined'}>.`;

        try {
            const prompt = interaction.options.get('prompt')?.value as string,
                choices = await itemize(interaction.options.get('choices')?.value as string, interaction);

            if (choices.length < 1)
                throw 'At least 1 choice is required.';

            const MAX_CHOICES = MAX_ACTION_ROWS * MAX_ROW_COMPONENTS;
            if (choices.length > MAX_CHOICES)
                throw `At most ${MAX_CHOICES} choices are allowed.`;

            if (choices.some(choice => choice.length > MAX_BUTTON_LABEL))
                throw `A choice must be at most ${MAX_BUTTON_LABEL} characters.`;

            const reply = await interaction.reply({
                content: `${interaction.user.toString()} made a poll`,
                fetchReply: true
            });

            const thread = await interaction.channel.threads.create({
                startMessage: reply.id,
                name: `${prompt}`,
                autoArchiveDuration: 1440
            });

            if (thread.joinable)
                await thread.join();

            const rows: MessageActionRowOptions[] = [];
            while (choices.length > 0) {
                rows.push({
                    type: 'ACTION_ROW',
                    components: choices.splice(0, MAX_ROW_COMPONENTS).map(choice => ({
                        type: 'BUTTON',
                        customId: `vote_${choice}`,
                        emoji: buildButtonEmoji(choice),
                        label: trunc(buildButtonChoice(choice), MAX_BUTTON_LABEL),
                        style: 'PRIMARY'
                    }))
                });
            }

            await thread.send({
                content: '**Vote Here**',
                components: rows
            });

            await thread.send({
                content: '**Moderate Votes**',
                components: [
                    {
                        type: 'ACTION_ROW',
                        components: buildModComponents()
                    }
                ]
            });

            // TODO moderator button: unseal all
            // TODO moderator button: peek all
            // TODO moderator button: tally
        }
        catch (error: unknown) {
            await interaction.reply({
                embeds: blame({ error, interaction }),
                ephemeral: true
            });
        }
    });

    // TODO too many listeners
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() || !interaction.customId.startsWith('vote_')) return;

        try {
            const choice = (interaction.component as MessageButton).customId?.slice(5);
            if (!choice) return;

            await interaction.reply({
                content: `${interaction.user.toString()} voted`,
                components: [
                    {
                        type: 'ACTION_ROW',
                        components: buildSealedComponents(choice)
                    }
                ]
            });

            await interaction.followUp({
                content: `You voted for **${choice}**`,
                ephemeral: true
            });
        }
        catch (error: unknown) {
            await interaction.reply({
                embeds: blame({ error, interaction }),
                ephemeral: true
            });
        }
    });

    const re_user = /<@!?(\d+)>/g;
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() || !interaction.customId.startsWith('unseal_')) return;

        if (!(interaction.channel instanceof ThreadChannel))
            throw `Unsupported channel <${interaction.channel?.toString() ?? 'undefined'}>.`;

        try {
            const choice = (interaction.component as MessageButton).customId?.slice(7),
                whose = interaction.message.content.match(re_user)?.[0];
            if (!choice || !whose) return;

            if (isAuthor(interaction, whose) || isThreadModerator(interaction)) {
                await interaction.update({
                    content: `${whose} voted for **${choice}**`,
                    components: [
                        {
                            type: 'ACTION_ROW',
                            components: buildUnsealedComponents(choice)
                        }
                    ]
                });
            }
            else {
                await interaction.reply({
                    content: `Only ${whose} or a moderator can unseal their vote.`,
                    ephemeral: true
                });
            }
        }
        catch (error: unknown) {
            await interaction.reply({
                embeds: blame({ error, interaction }),
                ephemeral: true
            });
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() || !interaction.customId.startsWith('reseal_')) return;

        if (!(interaction.channel instanceof ThreadChannel))
            throw `Unsupported channel <${interaction.channel?.toString() ?? 'undefined'}>.`;

        try {
            const choice = (interaction.component as MessageButton).customId?.slice(7),
                whose = interaction.message.content.match(re_user)?.[0];
            if (!choice || !whose) return;

            if (isAuthor(interaction, whose) || isThreadModerator(interaction)) {
                await interaction.update({
                    content: `${whose} voted`,
                    components: [
                        {
                            type: 'ACTION_ROW',
                            components: buildSealedComponents(choice)
                        }
                    ]
                });
            }
            else {
                await interaction.reply({
                    content: `Only ${whose} or a moderator can reseal their vote.`,
                    ephemeral: true
                });
            }
        }
        catch (error: unknown) {
            await interaction.reply({
                embeds: blame({ error, interaction }),
                ephemeral: true
            });
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() || !interaction.customId.startsWith('peek_')) return;

        if (!(interaction.channel instanceof ThreadChannel))
            throw `Unsupported channel <${interaction.channel?.toString() ?? 'undefined'}>.`;

        try {
            const choice = (interaction.component as MessageButton).customId?.slice(5),
                whose = interaction.message.content.match(re_user)?.[0];
            if (!choice || !whose) return;

            if (isAuthor(interaction, whose) || isThreadModerator(interaction)) {
                await interaction.reply({
                    content: `${interaction.user.toString() == whose ? 'You' : whose} voted for **${choice}**`,
                    ephemeral: true
                });
            }
            else {
                await interaction.reply({
                    content: `Only ${whose} or a moderator can peek at their vote.`,
                    ephemeral: true
                });
            }
        }
        catch (error: unknown) {
            await interaction.reply({
                embeds: blame({ error, interaction }),
                ephemeral: true
            });
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() || !interaction.customId.startsWith('discard_')) return;

        if (!(interaction.channel instanceof ThreadChannel))
            throw `Unsupported channel <${interaction.channel?.toString() ?? 'undefined'}>.`;

        try {
            const choice = (interaction.component as MessageButton).customId?.slice(8),
                whose = interaction.message.content.match(re_user)?.[0];
            if (!choice || !whose) return;

            if (isAuthor(interaction, whose) || isThreadModerator(interaction)) {
                await interaction.update({
                    content: `${whose} discarded a vote`,
                    components: [
                        {
                            type: 'ACTION_ROW',
                            components: buildDiscardedComponents(choice)
                        }
                    ]

                });
            }
            else {
                await interaction.reply({
                    content: `Only ${whose} or a moderator can discard their vote.`,
                    ephemeral: true
                });
            }
        }
        catch (error: unknown) {
            await interaction.reply({
                embeds: blame({ error, interaction }),
                ephemeral: true
            });
        }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() || !interaction.customId.startsWith('mod_')) return;

        if (!(interaction.channel instanceof ThreadChannel))
            throw `Unsupported channel <${interaction.channel?.toString() ?? 'undefined'}>.`;

        try {
            const action = (interaction.component as MessageButton).customId?.slice(4);
            if (!action) return;

            if (isThreadModerator(interaction)) {
                const messages = await interaction.channel.messages.fetch();

                if (action == 'unseal') {
                    const results: string[] = messages.filter(message => message.author.bot).map(message => {
                        const header = (message?.components[0]?.components[0] as MessageButton)?.label;
                        if (header == 'Unseal') {
                            const whose = message?.content?.match(re_user)?.[0],
                                choice = (message?.components[0]?.components[0] as MessageButton)?.customId?.slice(7);
                            if (!whose || !choice) return;

                            void message.edit({
                                content: `${whose} voted for **${choice}**`,
                                components: [
                                    {
                                        type: 'ACTION_ROW',
                                        components: buildUnsealedComponents(choice)
                                    }
                                ]
                            });

                            return `${whose} voted for **${choice}**`;
                        }
                    }).filter(Boolean).map(String);

                    results.unshift(`You unsealed **${results.length}** votes`);
                    await interaction.reply({
                        content: results.join('\n'),
                        ephemeral: true
                    });
                }
                else if (action == 'reseal') {
                    const results: string[] = messages.filter(message => message.author.bot).map(message => {
                        const header = (message?.components[0]?.components[0] as MessageButton)?.label;
                        if (header == 'Reseal') {
                            const whose = message?.content?.match(re_user)?.[0],
                                choice = (message?.components[0]?.components[0] as MessageButton)?.customId?.slice(7);
                            if (!whose || !choice) return;

                            void message.edit({
                                content: `${whose} voted`,
                                components: [
                                    {
                                        type: 'ACTION_ROW',
                                        components: buildSealedComponents(choice)
                                    }
                                ]
                            });

                            return `${whose} voted`;
                        }
                    }).filter(Boolean).map(String);

                    results.unshift(`You resealed **${results.length}** votes`);
                    await interaction.reply({
                        content: results.join('\n'),
                        ephemeral: true
                    });
                }
                else if (action == 'peek') {
                    const results: string[] = messages.filter(message => message.author.bot).map(message => {
                        const header = (message?.components[0]?.components[0] as MessageButton)?.label;
                        if (header == 'Unseal' || header == 'Reseal') {
                            const whose = message?.content?.match(re_user)?.[0],
                                choice = (message?.components[0]?.components[0] as MessageButton)?.customId?.slice(7);
                            if (!whose || !choice) return;

                            return `${whose} voted for **${choice}**`;
                        }
                    }).filter(Boolean).map(String);

                    results.unshift(`You peeked **${results.length}** votes`);
                    await interaction.reply({
                        content: results.join('\n'),
                        ephemeral: true
                    });
                }
            }
            else {
                await interaction.reply({
                    content: `Only a moderator can ${action} all votes.`,
                    ephemeral: true
                });
            }
        }
        catch (error: unknown) {
            await interaction.reply({
                embeds: blame({ error, interaction }),
                ephemeral: true
            });
        }
    });

    function buildButtonEmoji (choice: string): string | undefined {
        const match = choice.match(re_user);
        if (match)
            return match.length == 1 ? '👤' : '👥';
        else
            return undefined;
    }

    function buildButtonChoice (choice: string): string {
        return choice.replaceAll(re_user, (_, id) =>
            client.users.cache.get(id)?.username ?? 'Unknown'
        );
    }

    function buildModComponents (): MessageActionRowComponentResolvable[] {
        return [
            {
                type: 'BUTTON',
                customId: 'mod_unseal',
                emoji: '🗳️',
                label: 'Unseal All',
                style: 'DANGER'
            },
            {
                type: 'BUTTON',
                customId: 'mod_reseal',
                emoji: '🗳️',
                label: 'Reseal All',
                style: 'DANGER'
            },
            {
                type: 'BUTTON',
                customId: 'mod_peek',
                emoji: '🔍',
                label: 'Peek All',
                style: 'DANGER'
            }
        ];
    }

    function buildSealedComponents (choice: string): MessageActionRowComponentResolvable[] {
        return [
            {
                type: 'BUTTON',
                customId: `unseal_${choice}`,
                emoji: '🗳️',
                label: 'Unseal',
                style: 'SECONDARY'
            },
            {
                type: 'BUTTON',
                customId: `peek_${choice}`,
                emoji: '🔍',
                label: 'Peek',
                style: 'SECONDARY'
            },
            {
                type: 'BUTTON',
                customId: `discard_${choice}`,
                emoji: '🗑️',
                label: 'Discard',
                style: 'SECONDARY'
            }
        ];
    }



    function buildUnsealedComponents (choice: string): MessageActionRowComponentResolvable[] {
        return [
            {
                type: 'BUTTON',
                customId: `reseal_${choice}`,
                emoji: '🗳️',
                label: 'Reseal',
                style: 'SECONDARY'
            }
        ];
    }

    function buildDiscardedComponents (choice: string): MessageActionRowComponentResolvable[] {
        return [
            {
                type: 'BUTTON',
                customId: `reseal_${choice}`,
                emoji: '🗑️',
                label: 'Restore',
                style: 'SECONDARY'
            }
        ];
    }

    function isThreadModerator (interaction: Interaction): boolean {
        const permissions = (interaction.channel as ThreadChannel).permissionsFor(interaction.user);
        return permissions?.has(Permissions.FLAGS.MANAGE_MESSAGES) ?? false;
    }

    function isAuthor (interaction: Interaction, whose?: string): boolean {
        return interaction.user.toString() == whose;
    }

};