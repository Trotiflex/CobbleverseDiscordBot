import { config } from 'dotenv';
import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { readFileSync, existsSync } from 'fs';
import PokemonData from './src/index.js';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Charger pokemonData
let pokemonData = {};
try {
    pokemonData = PokemonData.pokemon;
    console.log('pokemonData chargé avec', Object.keys(pokemonData).length, 'Pokémon:', Object.keys(pokemonData));
} catch (error) {
    console.error('Erreur lors du chargement de pokemonData:', error.message);
    pokemonData = {
        skitty: { evolution: 'delcatty', method: 'Use a Moon Stone' },
        noibat: { evolution: 'noivern', method: 'Reach level 48' },
        feebas: { evolution: 'milotic', method: 'Use a Link Cable while holding a Prism Scale' }
    };
    console.log('pokemonData par défaut:', Object.keys(pokemonData));
}

// Charger championsData
let championsData = [];
try {
    championsData = PokemonData.champions;
    console.log('championsData chargé avec', championsData.length, 'champions');
} catch (error) {
    console.error('Erreur lors du chargement de championsData:', error.message);
    championsData = [
        { name: 'Brock', order: 1, biome: 'Plains', level_cap: 21 }
    ];
    console.log('championsData par défaut:', championsData.map(c => c.name));
}

// Charger legendariesData
let legendariesData = [];
try {
    legendariesData = PokemonData.legendaries;
    console.log('legendariesData chargé avec', legendariesData.length, 'légendaires');
} catch (error) {
    console.error('Erreur lors du chargement de legendariesData:', error.message);
    legendariesData = [
        { name: 'Articuno', evolution: null, spawn: 'Spawns in ice biomes' }
    ];
    console.log('legendariesData par défaut:', legendariesData.map(l => l.name));
}

// Charger structuresData
let structuresData = { structures: { villages_and_associated: [], gyms: [], legendary_structures: [], fossil_dig_sites: [], other_cobblemon_structures: [] } };
try {
    structuresData = PokemonData.structures;
    console.log('structuresData chargé avec', 
        Object.values(structuresData.structures).reduce((total, category) => total + category.length, 0), 
        'structures');
} catch (error) {
    console.error('Erreur lors du chargement de structuresData:', error.message);
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

// Charger starterData depuis starter.json
let starterData = [];
try {
    const starterFilePath = './src/data/starter.json';
    if (!existsSync(starterFilePath)) {
        throw new Error(`Le fichier ${starterFilePath} n'existe pas. Veuillez créer le fichier dans le dossier data/.`);
    }
    const starterJson = JSON.parse(readFileSync(starterFilePath, 'utf8'));
    if (starterJson.starters && Array.isArray(starterJson.starters)) {
        starterData = starterJson.starters;
        console.log('starterData chargé avec', starterData.length, 'régions:', starterData.map(r => r.name));
    } else {
        throw new Error('Clé starters manquante ou invalide dans starter.json');
    }
} catch (error) {
    console.error('Erreur lors du chargement de starter.json:', error.message);
    starterData = [
        {
            name: 'paldea',
            displayName: 'cobblemon.starterselection.category.paldea',
            pokemon: [
                'Fuecoco level=5',
                'Quaxly level=5',
                'Sprigatito level=5'
            ]
        }
    ];
    console.log('starterData par défaut chargé avec', starterData.length, 'régions:', starterData.map(r => r.name));
}

// Fonction pour formater les Pokémon
function formatPokemon(pokemon) {
    // Supprimer "level=5" et formater les Pokéballs
    let formatted = pokemon.replace(/level=5\s*/g, '').trim();
    formatted = formatted.replace(/pokeball=([\w_]+)/g, '**$1**');
    // Mettre en majuscule la première lettre du nom du Pokémon
    const [name, ...rest] = formatted.split(' ');
    return `${name.charAt(0).toUpperCase() + name.slice(1)} ${rest.join(' ')}`.trim();
}

// Fonction pour l’embed légendaire
async function createLegendaryEmbed(page, itemsPerPage = 10) {
    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, legendariesData.length);
    const embed = new EmbedBuilder()
        .setTitle('Pokémon Légendaires dans Cobbleverse')
        .setDescription(`Liste de tous les Pokémon légendaires, leurs lieux d’apparition et détails d’évolution. (Page ${page + 1}/${Math.ceil(legendariesData.length / itemsPerPage)})`)
        .setColor('#fffa68')
        .setFooter({ text: 'Utilisez /legendary [pokemon] pour des détails spécifiques !' })
        .setTimestamp();

    for (let i = start; i < end; i++) {
        const l = legendariesData[i];
        let evolutionText = "";
        if (l.evolution) {
            evolutionText = `Évolue en ${l.evolution.charAt(0).toUpperCase() + l.evolution.slice(1)}`;
        } else if (l.evolutions) {
            evolutionText = l.evolutions.map(evo => `Évolue en ${evo.name.charAt(0).toUpperCase() + evo.name.slice(1)} : ${evo.method}`).join('\n');
        }
        embed.addFields({
            name: l.name,
            value: `Apparition : ${l.spawn}\nÉvolution : ${evolutionText || 'N’évolue pas'}`,
            inline: false
        });
    }
    return embed;
}

// Définir les commandes
const commands = [
    new SlashCommandBuilder()
        .setName('evolve')
        .setDescription('Vérifie comment un Pokémon évolue')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('Nom du Pokémon')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('locate')
        .setDescription('Localise une structure dans Cobbleverse')
        .addStringOption(option =>
            option.setName('structure')
                .setDescription('Nom de la structure (ex. Village Custom, Sky Pillar)')
                .setRequired(true)
                .setAutocomplete(true)),
    new SlashCommandBuilder()
        .setName('cobbleverse')
        .setDescription('Obtient des informations sur le modpack Cobbleverse'),
    new SlashCommandBuilder()
        .setName('starter')
        .setDescription('Affiche les Pokémon de départ dans Cobbleverse'),
    new SlashCommandBuilder()
        .setName('champions')
        .setDescription('Liste tous les champions ou donne les détails d’un champion spécifique')
        .addStringOption(option =>
            option.setName('champion')
                .setDescription('Nom du champion (ex. Brock)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('legendary')
        .setDescription('Liste tous les Pokémon légendaires ou donne les détails d’un légendaire')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('Nom du Pokémon légendaire (ex. Articuno)')
                .setRequired(false))
].map(command => command.toJSON());

// Enregistrer les commandes
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log('Commandes enregistrées !');
    } catch (error) {
        console.error('Erreur lors de l’enregistrement des commandes:', error);
    }
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName, options } = interaction;

        if (commandName === 'evolve') {
            const pokemonName = options.getString('pokemon').toLowerCase();
            console.log('Recherche de', pokemonName, 'dans pokemonData');
            if (pokemonData[pokemonName]) {
                const data = pokemonData[pokemonName];
                const embed = new EmbedBuilder()
                    .setTitle('Évolution de Pokémon')
                    .setDescription(`**${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)}**`)
                    .setColor('#fffa68')
                    .setFooter({ text: 'Essayez un autre Pokémon avec /evolve [pokemon] !' })
                    .setTimestamp();
                if (data.evolution) {
                    embed.addFields(
                        { name: 'Évolue en', value: data.evolution.charAt(0).toUpperCase() + data.evolution.slice(1), inline: true },
                        { name: 'Méthode', value: data.method, inline: true }
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
                    embed.addFields({ name: 'Évolution', value: `N’évolue pas : ${data.method}` });
                }
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('Erreur')
                    .setDescription(`Désolé, aucune donnée pour **${pokemonName}**. Essayez un autre Pokémon !`)
                    .setColor('#ff0000')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
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
                    'Utilisez `/locate structure bca:custom_village` en jeu pour trouver le village le plus proche.' :
                    structure.name === 'Arena' ?
                    'Utilisez `/locate structure cobbleverse:arena` en jeu pour trouver l’arène la plus proche. Cherchez près des villages dans les biomes plaines ou aquatiques !' :
                    'Explorez les biomes listés ou utilisez une carte de cartographe pour localiser cette structure.';
                const embed = new EmbedBuilder()
                    .setTitle(structure.name)
                    .setDescription(structure.description)
                    .setColor('#fffa68')
                    .addFields(
                        { name: 'Biomes', value: biomes, inline: true },
                        { name: 'Instructions', value: instructions, inline: true }
                    )
                    .setFooter({ text: 'Essayez une autre structure avec /locate [structure] !' })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('Erreur')
                    .setDescription(`Structure inconnue : **${structureName}**. Essayez "Custom Village", "Sky Pillar" ou "Brock's Gym".`)
                    .setColor('#ff0000')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } else if (commandName === 'cobbleverse') {
            const embed = new EmbedBuilder()
                .setTitle('À Propos de Cobbleverse')
                .setDescription('**Cobbleverse** est un modpack basé sur Cobblemon, avec 965+ Pokémon, des structures personnalisées, des arènes et des champions !')
                .setColor('#fffa68')
                .addFields(
                    { name: 'Wiki', value: '[cobbleverse.fandom.com](https://cobbleverse.fandom.com)', inline: true },
                    { name: 'Discord', value: 'https://discord.gg/kE7wtBgG', inline: true }
                )
                .setFooter({ text: 'Explorez plus avec d’autres commandes !' })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } else if (commandName === 'starter') {
            try {
                let description = 'Voici les Pokémon de départ disponibles dans **Cobbleverse** :\n\n';
                if (starterData.length === 0) {
                    description += 'Aucun Pokémon de départ disponible. Contactez un administrateur.';
                } else {
                    starterData.forEach(region => {
                        const regionName = region.name.toUpperCase();
                        description += `**Région : ${regionName}**\n`;
                        description += region.pokemon.map(p => `- ${formatPokemon(p)}`).join('\n') + '\n';
                        description += '_Tous les Pokémon sont au niveau 5_\n\n';
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🌟 Pokémon de Départ dans Cobbleverse 🌟')
                    .setDescription(description)
                    .setColor('#fffa68')
                    .setTimestamp()
                    .setFooter({ text: 'Cobbleverse Modpack | Basé sur Cobblemon' });

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Erreur lors de la commande /starter:', error);
                const embed = new EmbedBuilder()
                    .setTitle('❌ Erreur')
                    .setDescription('Impossible de charger les Pokémon de départ. Contactez un administrateur.')
                    .setColor('#ff0000')
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
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
                            { name: 'Ordre', value: champion.order.toString(), inline: true },
                            { name: 'Biome', value: champion.biome, inline: true },
                            { name: 'Niveau Max', value: `${champion.level_cap}${note}`, inline: true }
                        )
                        .setFooter({ text: 'Utilisez /champions pour voir tous les champions !' })
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('Erreur')
                        .setDescription(`Désolé, aucune donnée pour **${championName}**. Essayez un autre champion (ex. Brock, Misty) !`)
                        .setColor('#ff0000')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('Tous les Champions dans Cobbleverse')
                    .setDescription('Liste de tous les champions, leur ordre, biomes et niveaux maximum dans Cobbleverse.')
                    .setColor('#fffa68')
                    .setFooter({ text: 'Utilisez /champions [champion] pour des détails spécifiques !' })
                    .setTimestamp();
                championsData.forEach(c => {
                    const note = c.note ? ` (${c.note})` : '';
                    embed.addFields({
                        name: c.name,
                        value: `Ordre : ${c.order}, Biome : ${c.biome}, Niveau Max : ${c.level_cap}${note}`,
                        inline: false
                    });
                });
                await interaction.reply({ embeds: [embed] });
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
                            { name: 'Apparition', value: legendary.spawn, inline: true }
                        )
                        .setFooter({ text: 'Utilisez /legendary pour voir tous les légendaires !' })
                        .setTimestamp();
                    if (legendary.evolution) {
                        embed.addFields({
                            name: 'Évolution',
                            value: `Évolue en ${legendary.evolution.charAt(0).toUpperCase() + legendary.evolution.slice(1)}`,
                            inline: true
                        });
                    } else if (legendary.evolutions) {
                        legendary.evolutions.forEach(evo => {
                            embed.addFields({
                                name: 'Évolution',
                                value: `Évolue en ${evo.name.charAt(0).toUpperCase() + evo.name.slice(1)} : ${evo.method}`,
                                inline: true
                            });
                        });
                    } else {
                        embed.addFields({
                            name: 'Évolution',
                            value: 'N’évolue pas',
                            inline: true
                        });
                    }
                    await interaction.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle('Erreur')
                        .setDescription(`Désolé, aucune donnée pour **${pokemonName}**. Essayez un autre légendaire (ex. Articuno, Mewtwo) !`)
                        .setColor('#ff0000')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], ephemeral: true });
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
                const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

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
                    await i.update({ embeds: [newEmbed], components: [row] });
                });

                collector.on('end', async () => {
                    prevButton.setDisabled(true);
                    nextButton.setDisabled(true);
                    await message.edit({ components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] });
                });
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
            await interaction.respond(
                filtered.map(name => ({ name, value: name }))
            );
        }
    }
});

client.login(process.env.DISCORD_TOKEN);