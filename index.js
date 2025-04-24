import { config } from 'dotenv';
import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import PokemonData from './src/data/index.js';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let pokemonData = {};
try {
    pokemonData = PokemonData.pokemon;
    console.log('pokemonData chargé avec', Object.keys(pokemonData).length, 'Pokémon:', Object.keys(pokemonData));
} catch (error) {
    console.error('Erreur lors du chargement de pokemon_data.json:', error);
    pokemonData = {
        skitty: { evolution: 'delcatty', method: 'Use a Moon Stone' },
        noibat: { evolution: 'noivern', method: 'Reach level 48' },
        feebas: { evolution: 'milotic', method: 'Use a Link Cable while holding a Prism Scale' }
    };
    console.log('pokemonData par défaut:', Object.keys(pokemonData));
}

let championsData = [];
try {
    championsData = PokemonData.champions;
    console.log('championsData chargé avec', championsData.length, 'champions');
} catch (error) {
    console.error('Erreur lors du chargement de cobbleverse_champions.json:', error);
    championsData = [
        { name: 'Brock', order: 1, biome: 'Plains', level_cap: 21 }
    ];
    console.log('championsData par défaut:', championsData.map(c => c.name));
}

let legendariesData = [];
try {
    legendariesData = PokemonData.legendaries;
    console.log('legendariesData chargé avec', legendariesData.length, 'légendaires');
} catch (error) {
    console.error('Erreur lors du chargement de legendaries.json:', error);
    legendariesData = [
        { name: 'Articuno', evolution: null, spawn: 'Spawns in ice biomes' }
    ];
    console.log('legendariesData par défaut:', legendariesData.map(l => l.name));
}

let structuresData = { structures: { villages_and_associated: [], gyms: [], legendary_structures: [], fossil_dig_sites: [], other_cobblemon_structures: [] } };
try {
    structuresData = PokemonData.structures;
    console.log('structuresData chargé avec', 
        Object.values(structuresData.structures).reduce((total, category) => total + category.length, 0), 
        'structures');
} catch (error) {
    console.error('Erreur lors du chargement de cobbleverse_structures.json:', error);
    structuresData = {
        structures: {
            villages_and_associated: [
                { name: 'Arena', biomes: ['Plains', 'Aquatic'], description: 'Arena for Pokémon battles.' }
            ],
            gyms: [],
            legendary_structures: [],
            fossil_dig_sites: [],
            other_cobblemon_structures: []
        }
    };
    console.log('structuresData par défaut:', structuresData.structures.villages_and_associated.map(s => s.name));
}

const starters = [
    'bulbasaur', 'charmander', 'squirtle',
    'chikorita', 'cyndaquil', 'totodile',
    'treecko', 'torchic', 'mudkip',
    'turtwig', 'chimchar', 'piplup',
    'snivy', 'tepig', 'oshawott',
    'chespin', 'fennekin', 'froakie',
    'rowlet', 'litten', 'popplio',
    'grookey', 'scorbunny', 'sobble',
    'sprigatito', 'fuecoco', 'quaxly'
];

async function createLegendaryEmbed(page, itemsPerPage = 10) {
    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, legendariesData.length);
    const embed = new EmbedBuilder()
        .setTitle('Legendary Pokémon in Cobbleverse')
        .setDescription(`List of all legendary Pokémon, their spawn locations, and evolution details in Cobbleverse. (Page ${page + 1}/${Math.ceil(legendariesData.length / itemsPerPage)})`)
        .setColor('#fffa68')
        .setFooter({ text: 'Use /legendary [pokemon] for specific details!' })
        .setTimestamp();

    for (let i = start; i < end; i++) {
        const l = legendariesData[i];
        let evolutionText = "";
        if (l.evolution) {
            evolutionText = `Evolves into ${l.evolution.charAt(0).toUpperCase() + l.evolution.slice(1)}`;
        } else if (l.evolutions) {
            evolutionText = l.evolutions.map(evo => `Evolves into ${evo.name.charAt(0).toUpperCase() + evo.name.slice(1)}: ${evo.method}`).join('\n');
        }
        embed.addFields({
            name: l.name,
            value: `Spawn: ${l.spawn}\nEvolution: ${evolutionText || 'Does not evolve'}`,
            inline: false
        });
    }
    return embed;
}

client.once('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('evolve')
            .setDescription('Check how a Pokémon evolves')
            .addStringOption(option =>
                option.setName('pokemon')
                    .setDescription('The Pokémon name')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('locate')
            .setDescription('Locate a structure in Cobbleverse')
            .addStringOption(option =>
                option.setName('structure')
                    .setDescription('The structure name (e.g., Custom Village, Sky Pillar)')
                    .setRequired(true)
                    .setAutocomplete(true)
            ),
        new SlashCommandBuilder()
            .setName('cobbleverse')
            .setDescription('Get info about Cobbleverse'),
        new SlashCommandBuilder()
            .setName('starter')
            .setDescription('List all starter Pokémon available in Cobbleverse'),
        new SlashCommandBuilder()
            .setName('champions')
            .setDescription('List all Cobbleverse champions or get details for a specific champion')
            .addStringOption(option =>
                option.setName('champion')
                    .setDescription('The champion name (optional, e.g., Brock)')
                    .setRequired(false)
            ),
        new SlashCommandBuilder()
            .setName('legendary')
            .setDescription('List all legendary Pokémon or get details for a specific legendary')
            .addStringOption(option =>
                option.setName('pokemon')
                    .setDescription('The legendary Pokémon name (optional, e.g., Articuno)')
                    .setRequired(false)
            ),
        // new SlashCommandBuilder()
        //     .setName('rag')
        //     .setDescription('Ask a question about Cobbleverse with RAG')
        //     .addStringOption(option =>
        //         option.setName('query')
        //             .setDescription('Your question about Cobbleverse')
        //             .setRequired(true)
        //     )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log('Commandes enregistrées !');
    } catch (error) {
        console.error('Erreur lors de l’enregistrement des commandes:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName, options } = interaction;

        if (commandName === 'evolve') {
            const pokemonName = options.getString('pokemon').toLowerCase();
            console.log('Recherche de', pokemonName, 'dans pokemonData');
            if (pokemonData[pokemonName]) {
                const data = pokemonData[pokemonName];
                const embed = new EmbedBuilder()
                    .setTitle('Pokémon Evolution')
                    .setDescription(`**${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)}**`)
                    .setColor('#fffa68')
                    .setFooter({ text: 'Try another Pokémon with /evolve [pokemon]!' })
                    .setTimestamp();
                if (data.evolution) {
                    embed.addFields(
                        { name: 'Evolves Into', value: data.evolution.charAt(0).toUpperCase() + data.evolution.slice(1), inline: true },
                        { name: 'Method', value: data.method, inline: true }
                    );
                } else if (data.evolutions) {
                    data.evolutions.forEach(evo => {
                        embed.addFields({
                            name: evo.name.charAt(0).toUpperCase() + evo.name.slice(1),
                            value: evo.method,
                            inline: true
                        });
                    });
                } else {
                    embed.addFields({ name: 'Evolution', value: `Does not evolve: ${data.method}` });
                }
                try {
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Erreur lors de la réponse à /evolve:', error);
                }
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription(`Sorry, I don't have data for **${pokemonName}**. Try another Pokémon!`)
                    .setColor('#ff0000')
                    .setTimestamp();
                try {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } catch (error) {
                    console.error('Erreur lors de la réponse d\'erreur à /evolve:', error);
                    await interaction.reply({ embeds: [embed] });
                }
            }
        } else if (commandName === 'locate') {
            const structureName = options.getString('structure');
            let structure = null;
            for (const category of Object.values(structuresData.structures)) {
                structure = category.find(s => s.name.toLowerCase() === structureName.toLowerCase());
                if (structure) break;
            }
            if (structure) {
                const biomes = structure.biomes.join(', ');
                const instructions = structure.name === 'Custom Village' ? 
                    'Use `/locate structure bca:custom_village` in-game to find the nearest village.' :
                    structure.name === 'Arena' ?
                    'Use `/locate structure cobbleverse:arena` in-game to find the nearest arena. Check near villages in plains or aquatic biomes!' :
                    'Explore the listed biomes or use a cartographer map to locate this structure.';
                const embed = new EmbedBuilder()
                    .setTitle(structure.name)
                    .setDescription(structure.description)
                    .setColor('#fffa68')
                    .addFields(
                        { name: 'Biomes', value: biomes, inline: true },
                        { name: 'Instructions', value: instructions, inline: true }
                    )
                    .setFooter({ text: 'Try another structure with /locate [structure]!' })
                    .setTimestamp();
                try {
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Erreur lors de la réponse à /locate:', error);
                }
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription(`Unknown structure: **${structureName}**. Try 'Custom Village', 'Sky Pillar', or 'Brock's Gym'.`)
                    .setColor('#ff0000')
                    .setTimestamp();
                try {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } catch (error) {
                    console.error('Erreur lors de la réponse d\'erreur à /locate:', error);
                    await interaction.reply({ embeds: [embed] });
                }
            }
        } else if (commandName === 'cobbleverse') {
            const embed = new EmbedBuilder()
                .setTitle('About Cobbleverse')
                .setDescription('**Cobbleverse** is a modpack based on Cobblemon, featuring 965+ Pokémon, custom structures, arenas, and champions!')
                .setColor('#fffa68')
                .addFields(
                    { name: 'Wiki', value: '[cobbleverse.fandom.com](https://cobbleverse.fandom.com)', inline: true },
                    { name: 'Discord', value: 'https://discord.gg/kE7wtBgG', inline: true }
                )
                .setFooter({ text: 'Explore more with other commands!' })
                .setTimestamp();
            try {
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Erreur lors de la réponse à /cobbleverse:', error);
            }
        } else if (commandName === 'starter') {
            const embed = new EmbedBuilder()
                .setTitle('Available Starters in Cobbleverse')
                .setDescription('List of all starter Pokémon across generations available in Cobbleverse.')
                .setColor('#fffa68')
                .addFields(
                    { name: 'Gen 1', value: starters.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 2', value: starters.slice(3, 6).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 3', value: starters.slice(6, 9).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 4', value: starters.slice(9, 12).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 5', value: starters.slice(12, 15).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 6', value: starters.slice(15, 18).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 7', value: starters.slice(18, 21).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 8', value: starters.slice(21, 24).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true },
                    { name: 'Gen 9', value: starters.slice(24, 27).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', '), inline: true }
                )
                .setFooter({ text: 'Use /evolve [pokemon] to check their evolutions!' })
                .setTimestamp();
            try {
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Erreur lors de la réponse à /starter:', error);
            }
        } else if (commandName === 'champions') {
            const championName = options.getString('champion')?.toLowerCase();
            if (championName) {
                const champion = championsData.find(c => c.name.toLowerCase() === championName);
                if (champion) {
                    const note = champion.note ? ` (${champion.note})` : '';
                    const embed = new EmbedBuilder()
                        .setTitle(champion.name)
                        .setColor('#fffa68')
                        .addFields(
                            { name: 'Order', value: champion.order.toString(), inline: true },
                            { name: 'Biome', value: champion.biome, inline: true },
                            { name: 'Level Cap', value: `${champion.level_cap}${note}`, inline: true }
                        )
                        .setFooter({ text: 'Use /champions to see all champions!' })
                        .setTimestamp();
                    try {
                        await interaction.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Erreur lors de la réponse à /champions (spécifique):', error);
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(`Sorry, I don't have data for **${championName}**. Try another champion (e.g., Brock, Misty)!`)
                        .setColor('#ff0000')
                        .setTimestamp();
                    try {
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    } catch (error) {
                        console.error('Erreur lors de la réponse d\'erreur à /champions:', error);
                        await interaction.reply({ embeds: [embed] });
                    }
                }
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('All Champions in Cobbleverse')
                    .setDescription('List of all champions, their order, biomes, and level caps in Cobbleverse.')
                    .setColor('#fffa68')
                    .setFooter({ text: 'Use /champions [champion] for specific details!' })
                    .setTimestamp();
                championsData.forEach(c => {
                    const note = c.note ? ` (${c.note})` : '';
                    embed.addFields({
                        name: c.name,
                        value: `Order: ${c.order}, Biome: ${c.biome}, Level Cap: ${c.level_cap}${note}`,
                        inline: false
                    });
                });
                try {
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Erreur lors de la réponse à /champions (liste):', error);
                }
            }
        } else if (commandName === 'legendary') {
            const pokemonName = options.getString('pokemon')?.toLowerCase();
            if (pokemonName) {
                const legendary = legendariesData.find(l => l.name.toLowerCase() === pokemonName);
                if (legendary) {
                    const embed = new EmbedBuilder()
                        .setTitle(legendary.name)
                        .setColor('#fffa68')
                        .addFields(
                            { name: 'Spawn', value: legendary.spawn, inline: true }
                        )
                        .setFooter({ text: 'Use /legendary to see all legendaries!' })
                        .setTimestamp();
                    if (legendary.evolution) {
                        embed.addFields({
                            name: 'Evolution',
                            value: `Evolves into ${legendary.evolution.charAt(0).toUpperCase() + legendary.evolution.slice(1)}`,
                            inline: true
                        });
                    } else if (legendary.evolutions) {
                        legendary.evolutions.forEach(evo => {
                            embed.addFields({
                                name: 'Evolution',
                                value: `Evolves into ${evo.name.charAt(0).toUpperCase() + evo.name.slice(1)}: ${evo.method}`,
                                inline: true
                            });
                        });
                    } else {
                        embed.addFields({
                            name: 'Evolution',
                            value: 'Does not evolve',
                            inline: true
                        });
                    }
                    try {
                        await interaction.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Erreur lors de la réponse à /legendary (spécifique):', error);
                    }
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription(`Sorry, I don't have data for **${pokemonName}**. Try another legendary (e.g., Articuno, Mewtwo)!`)
                        .setColor('#ff0000')
                        .setTimestamp();
                    try {
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    } catch (error) {
                        console.error('Erreur lors de la réponse d\'erreur à /legendary:', error);
                        await interaction.reply({ embeds: [embed] });
                    }
                }
            } else {
                const itemsPerPage = 10;
                const totalPages = Math.ceil(legendariesData.length / itemsPerPage);

                const prevButton = new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);
                const nextButton = new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Suivant')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(totalPages <= 1);
                const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

                let currentPage = 0;
                const embed = await createLegendaryEmbed(currentPage, itemsPerPage);
                let message;
                try {
                    message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
                } catch (error) {
                    console.error('Erreur lors de la réponse à /legendary (pagination):', error);
                    return;
                }

                const filter = i => i.user.id === interaction.user.id && ['prev', 'next'].includes(i.customId);
                const collector = message.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async i => {
                    if (i.customId === 'prev' && currentPage > 0) {
                        currentPage--;
                    } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                        currentPage++;
                    }

                    prevButton.setDisabled(currentPage === 0);
                    nextButton.setDisabled(currentPage === totalPages - 1);

                    const newEmbed = await createLegendaryEmbed(currentPage, itemsPerPage);
                    try {
                        await i.update({ embeds: [newEmbed], components: [row] });
                    } catch (error) {
                        console.error('Erreur lors de la mise à jour de /legendary (pagination):', error);
                    }
                });

                collector.on('end', async () => {
                    prevButton.setDisabled(true);
                    nextButton.setDisabled(true);
                    try {
                        await message.edit({ components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] });
                    } catch (error) {
                        console.error('Erreur lors de la désactivation des boutons de /legendary:', error);
                    }
                });
            }
        } else if (commandName === 'rag') {
            const query = options.getString('query');
            try {
                const vectorStore = await embedding.getVectorStore();
                if (!vectorStore) {
                    const embed = new EmbedBuilder()
                        .setTitle('Erreur')
                        .setDescription('La base de connaissances n’est pas initialisée. Vérifiez que cobbleverse_guide.md existe et qu’Ollama fonctionne.')
                        .setColor('#ff0000')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }

                const { result } = await embedding.search(query, 2);
                const context = result.map(doc => doc.pageContent).join('\n\n');

                const response = await ollama.chat({
                    model: configJson.LLM_MODEL,
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant for the Cobbleverse modpack. Use the provided context to answer questions accurately.' },
                        { role: 'user', content: `Context: ${context}\n\nQuestion: ${query}` },
                    ],
                });

                const answer = response.message.content;

                const embed = new EmbedBuilder()
                    .setTitle('Cobbleverse RAG Answer')
                    .setDescription(answer)
                    .setColor('#fffa68')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Erreur lors du traitement RAG:', error);
                await interaction.reply({ content: 'Erreur lors de la génération de la réponse. Vérifiez qu’Ollama est en cours d’exécution.', ephemeral: true });
            }
        }
    } else if (interaction.isAutocomplete()) {
        const { commandName, options } = interaction;
        if (commandName === 'locate') {
            const focusedValue = options.getFocused();
            const structureNames = [];
            for (const category of Object.values(structuresData.structures)) {
                category.forEach(structure => {
                    structureNames.push(structure.name);
                });
            }
            const filtered = structureNames
                .filter(name => name.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25);
            try {
                await interaction.respond(
                    filtered.map(name => ({ name, value: name }))
                );
            } catch (error) {
                console.error('Erreur lors de l\'autocomplétion de /locate:', error);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);