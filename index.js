import { config } from 'dotenv';
import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import PokemonData from './src/index.js';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Charger pokemonData (fusion des Générations 7, 8 et 9)
let pokemonData = {};
try {
    pokemonData = {
        ...PokemonData.pokemon,
        ...{
            "rowlet": { evolution: "dartrix", method: "Reach level 17", spawn: { biomes: ["forest", "jungle"], time: "day", rarity: "common" } },
            "dartrix": { evolution: "decidueye", method: "Reach level 34", spawn: { biomes: ["forest", "jungle"], time: "day", rarity: "uncommon" } },
            "decidueye": { evolution: null, method: "Does not evolve", spawn: { biomes: ["forest", "jungle"], time: "day", rarity: "rare" } },
            "litten": { evolution: "torracat", method: "Reach level 17", spawn: { biomes: ["savanna", "badlands"], time: "day", rarity: "common" } },
            "torracat": { evolution: "incineroar", method: "Reach level 34", spawn: { biomes: ["savanna", "badlands"], time: "day", rarity: "uncommon" } },
            "incineroar": { evolution: null, method: "Does not evolve", spawn: { biomes: ["badlands", "volcanic"], time: "day", rarity: "rare" } },
            "popplio": { evolution: "brionne", method: "Reach level 17", spawn: { biomes: ["beach", "ocean"], time: "day", rarity: "common" } },
            "brionne": { evolution: "primarina", method: "Reach level 34", spawn: { biomes: ["ocean", "beach"], time: "day", rarity: "uncommon" } },
            "primarina": { evolution: null, method: "Does not evolve", spawn: { biomes: ["ocean", "deep_ocean"], time: "day", rarity: "rare" } },
        },
        ...{
            "grookey": { evolution: "thwackey", method: "Reach level 16", spawn: { biomes: ["forest", "jungle"], time: "day", rarity: "common" } },
            "thwackey": { evolution: "rillaboom", method: "Reach level 35", spawn: { biomes: ["forest", "jungle"], time: "day", rarity: "uncommon" } },
            "rillaboom": { evolution: null, method: "Does not evolve", spawn: { biomes: ["jungle", "forest"], time: "day", rarity: "rare" } },
            "scorbunny": { evolution: "raboot", method: "Reach level 16", spawn: { biomes: ["plains", "savanna"], time: "day", rarity: "common" } },
        }
    };
    console.log('pokemonData chargé avec', Object.keys(pokemonData).length, 'Pokémon:', Object.keys(pokemonData));
} catch (error) {
    console.error('Erreur lors du chargement de pokemonData:', error.message);
    pokemonData = {
        skitty: { evolution: 'delcatty', method: 'Use a Moon Stone', spawn: { biomes: ["plains", "forest"], time: "day", rarity: "common" } },
        noibat: { evolution: 'noivern', method: 'Reach level 48', spawn: { biomes: ["caves", "mountains"], time: "night", rarity: "uncommon" } },
        feebas: { evolution: 'milotic', method: 'Use a Link Cable while holding a Prism Scale', spawn: { biomes: ["ocean", "river"], time: "day", rarity: "rare" } }
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

// Charger structuresData depuis cobbleverse_structures.json
let structuresData = { structures: { villages_and_associated: [], gyms: [], legendary_structures: [], fossil_dig_sites: [], other_cobblemon_structures: [] } };
try {
    const structuresFilePath = './src/data/cobbleverse_structures.json';
    if (!existsSync(structuresFilePath)) {
        throw new Error(`Le fichier ${structuresFilePath} n'existe pas. Veuillez créer le fichier dans le dossier data/.`);
    }
    structuresData = JSON.parse(readFileSync(structuresFilePath, 'utf8'));
    Object.values(structuresData.structures).forEach(category => {
        category.forEach(structure => {
            if (structure.image && !structure.image.startsWith('YOUR_') && !isValidUrl(structure.image)) {
                const imagePath = join(process.cwd(), structure.image);
                if (!existsSync(imagePath)) {
                    console.warn(`Image locale introuvable pour ${structure.name}: ${structure.image}`);
                    structure.image = null;
                }
            }
        });
    });
    console.log('structuresData chargé avec', 
        Object.values(structuresData.structures).reduce((total, category) => total + category.length, 0), 
        'structures');
} catch (error) {
    console.error('Erreur lors du chargement de structuresData:', error.message);
    structuresData = {
        structures: {
            villages_and_associated: [
                { 
                    name: 'Arena', 
                    biomes: ['Plains', 'Aquatic'], 
                    description: 'Arena for Pokémon battles.',
                    image: null
                }
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

// Fonction pour valider une URL
function isValidUrl(string) {
    try {
        new URL(string);
        return string.startsWith('http://') || string.startsWith('https://');
    } catch (_) {
        return false;
    }
}

// Fonction pour formater les Pokémon
function formatPokemon(pokemon) {
    let formatted = pokemon.replace(/level=5\s*/g, '').trim();
    formatted = formatted.replace(/pokeball=([\w_]+)/g, '**$1**');
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
        if (!l) {
            console.warn(`[createLegendaryEmbed] Entrée undefined à l'index ${i}`);
            continue;
        }
        let evolutionText = "";
        if (l.evolution) {
            evolutionText = `Évolue en ${l.evolution.charAt(0).toUpperCase() + l.evolution.slice(1)}`;
        } else if (l.evolutions) {
            evolutionText = l.evolutions.map(evo => `Évolue en ${evo.name.charAt(0).toUpperCase() + evo.name.slice(1)} : ${evo.method}`).join('\n');
        } else {
            evolutionText = 'N’évolue pas';
        }
        embed.addFields({
            name: l.name || 'Inconnu',
            value: `Apparition : ${l.spawn || 'Inconnu'}\nÉvolution : ${evolutionText}`,
            inline: false
        });
    }
    return embed;
}

// Fonction pour créer un embed pour une catégorie de structures
function createCategoryEmbed(category, structures) {
    const categoryTitles = {
        gyms: 'Toutes les Arènes dans Cobbleverse',
        villages_and_associated: 'Tous les Villages dans Cobbleverse',
        legendary_structures: 'Toutes les Structures Légendaires dans Cobbleverse',
        fossil_dig_sites: 'Tous les Sites de Fouilles de Fossiles dans Cobbleverse',
        other_cobblemon_structures: 'Autres Structures Cobblemon dans Cobbleverse'
    };
    const categoryDescriptions = {
        gyms: 'Liste de toutes les arènes, leurs biomes et descriptions.',
        villages_and_associated: 'Liste de tous les villages personnalisés, leurs biomes et descriptions.',
        legendary_structures: 'Liste de toutes les structures associées aux Pokémon légendaires, leurs biomes et descriptions.',
        fossil_dig_sites: 'Liste de tous les sites de fouilles où des fossiles peuvent être trouvés, leurs biomes et descriptions.',
        other_cobblemon_structures: 'Liste des autres structures Cobblemon, leurs biomes et descriptions.'
    };

    const embed = new EmbedBuilder()
        .setTitle(categoryTitles[category] || `Structures: ${category}`)
        .setDescription(categoryDescriptions[category] || `Liste des structures dans la catégorie ${category}.`)
        .setColor('#fffa68')
        .setFooter({ text: 'Utilisez /locate [structure] pour des détails spécifiques !' })
        .setTimestamp();

    structures.forEach(structure => {
        console.log(`[createCategoryEmbed] Processing structure:`, structure);
        const biomes = Array.isArray(structure.biomes) ? structure.biomes.join(', ') : 'Unknown';
        embed.addFields({
            name: structure.name || 'Unknown Structure',
            value: `**Description**: ${structure.description || 'No description available'}\n**Biomes**: ${biomes}`,
            inline: false
        });
    });

    return embed;
}

// Fonction pour créer un embed pour la liste des Pokémon
async function createPokemonEmbed(page, itemsPerPage = 10) {
    const pokemonList = Object.keys(pokemonData).sort();
    const start = page * itemsPerPage;
    const end = Math.min(start + itemsPerPage, pokemonList.length);
    const embed = new EmbedBuilder()
        .setTitle('Pokémon dans Cobbleverse')
        .setDescription(`Liste de tous les Pokémon disponibles dans Cobbleverse. (Page ${page + 1}/${Math.ceil(pokemonList.length / itemsPerPage)})`)
        .setColor('#fffa68')
        .setFooter({ text: 'Utilisez /pokemon [nom] pour des détails spécifiques !' })
        .setTimestamp();

    for (let i = start; i < end; i++) {
        const pokemonName = pokemonList[i];
        const data = pokemonData[pokemonName];
        let evolutionText = "";
        if (data.evolution) {
            evolutionText = `Évolue en ${data.evolution.charAt(0).toUpperCase() + data.evolution.slice(1)}`;
        } else if (data.evolutions) {
            evolutionText = data.evolutions.map(evo => `Évolue en ${evo.name.charAt(0).toUpperCase() + evo.name.slice(1)} : ${evo.method}`).join('\n');
        } else {
            evolutionText = 'N’évolue pas';
        }
        const spawnText = data.spawn ? `Biomes : ${data.spawn.biomes.join(', ')}\nMoment : ${data.spawn.time}\nRareté : ${data.spawn.rarity}` : 'Aucune donnée de spawn';
        embed.addFields({
            name: pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1),
            value: `Évolution : ${evolutionText}\n${spawnText}`,
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
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(100)),
    new SlashCommandBuilder()
        .setName('locate')
        .setDescription('Localise une structure ou catégorie dans Cobbleverse')
        .addStringOption(option =>
            option.setName('structure')
                .setDescription('Nom de la structure (ex. Custom Village) ou catégorie (gym, village, legendary_structures)')
                .setRequired(true)
                .setAutocomplete(true)
                .setMinLength(1)
                .setMaxLength(100)),
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
                .setRequired(false)
                .setMinLength(1)
                .setMaxLength(100)),
    new SlashCommandBuilder()
        .setName('legendary')
        .setDescription('Liste tous les Pokémon légendaires ou donne les détails d’un légendaire')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('Nom du Pokémon légendaire (ex. Articuno)')
                .setRequired(false)
                .setMinLength(1)
                .setMaxLength(100)),
    new SlashCommandBuilder()
        .setName('pokemon')
        .setDescription('Liste tous les Pokémon ou donne les détails d’un Pokémon spécifique')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('Nom du Pokémon (ex. Pikachu)')
                .setRequired(false)
                .setMinLength(1)
                .setMaxLength(100)),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste de toutes les commandes disponibles et leurs descriptions')
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
    try {
        if (interaction.isCommand()) {
            const commandName = interaction.commandName;
            const options = interaction.options;

            if (commandName === 'evolve') {
                const pokemonName = options.getString('pokemon').toLowerCase();
                console.log(`[Command /evolve] pokemonName: "${pokemonName}" (length: ${pokemonName.length})`);
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
                const structureName = options.getString('structure').toLowerCase();
                console.log(`[Command /locate] structureName: "${structureName}" (length: ${structureName.length})`);

                const categoryMap = {
                    'gym': 'gyms',
                    'village': 'villages_and_associated',
                    'legendary_structures': 'legendary_structures',
                    'fossil_dig_site': 'fossil_dig_sites',
                    'other_structure': 'other_cobblemon_structures'
                };
                const categoryKey = categoryMap[structureName];
                
                if (categoryKey) {
                    const structures = structuresData.structures[categoryKey];
                    if (structures && structures.length > 0) {
                        const embed = createCategoryEmbed(categoryKey, structures);
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle('Erreur')
                            .setDescription(`Aucune structure trouvée pour la catégorie **${structureName}**.`)
                            .setColor('#ff0000')
                            .setTimestamp();
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                } else {
                    let structure = null;
                    for (const category of Object.values(structuresData.structures)) {
                        const validCategory = category.filter(s => typeof s.name === 'string');
                        structure = validCategory.find(s => s.name.toLowerCase() === structureName);
                        if (structure) break;
                    }
                    if (structure) {
                        const biomes = Array.isArray(structure.biomes) ? structure.biomes.join(', ') : 'Unknown';
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

                        let files = [];
                        if (structure.image) {
                            if (isValidUrl(structure.image) && !structure.image.startsWith('YOUR_')) {
                                embed.setImage(structure.image);
                            } else if (!structure.image.startsWith('YOUR_')) {
                                const imagePath = join(process.cwd(), structure.image);
                                if (existsSync(imagePath)) {
                                    embed.setImage(`attachment://${structure.image.split('/').pop()}`);
                                    files.push({ attachment: imagePath, name: structure.image.split('/').pop() });
                                } else {
                                    console.warn(`Image locale introuvable pour ${structure.name}: ${structure.image}`);
                                }
                            }
                        }

                        await interaction.reply({ embeds: [embed], files });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle('Erreur')
                            .setDescription(`Structure inconnue : **${structureName}**. Essayez "Custom Village", "Brock's Gym", "Dyna Tree", "gym", "village", "legendary_structures", "fossil_dig_site" ou "other_structure".`)
                            .setColor('#ff0000')
                            .setTimestamp();
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
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
                console.log(`[Command /champions] championName: "${championName}" (length: ${championName?.length || 0})`);
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
                console.log(`[Command /legendary] pokemonName: "${pokemonName}" (length: ${pokemonName?.length || 0})`);
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
                    if (legendariesData.length === 0) {
                        const embed = new EmbedBuilder()
                            .setTitle('Erreur')
                            .setDescription('Aucune donnée sur les Pokémon légendaires disponible. Contactez un administrateur.')
                            .setColor('#ff0000')
                            .setTimestamp();
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                        return;
                    }
                    await interaction.deferReply();
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
                    const message = await interaction.editReply({ embeds: [embed], components: [row] });

                    console.log('Message object:', message);

                    const filter = i => i.user.id === interaction.user.id && ['prev', 'next'].includes(i.customId);
                    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                    collector.on('collect', async i => {
                        console.log('[Button Collector] Interaction reçue:', i.customId, i.user.id);
                        try {
                            if (i.customId === 'prev' && currentPage > 0) {
                                currentPage--;
                            } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                                currentPage++;
                            }

                            prevButton.setDisabled(currentPage === 0);
                            nextButton.setDisabled(currentPage === totalPages - 1);

                            const newEmbed = await createLegendaryEmbed(currentPage, itemsPerPage);
                            console.log('[Button Collector] Mise à jour de la page:', currentPage + 1);
                            await i.update({ embeds: [newEmbed], components: [row] });
                        } catch (error) {
                            console.error('[Button Collector] Erreur:', error);
                            collector.stop();
                        }
                    });

                    collector.on('end', async () => {
                        prevButton.setDisabled(true);
                        nextButton.setDisabled(true);
                        try {
                            await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] });
                        } catch (error) {
                            console.error('[Collector End] Erreur lors de la mise à jour finale:', error);
                        }
                    });
                }
            } else if (commandName === 'pokemon') {
                const pokemonName = options.getString('pokemon')?.toLowerCase();
                console.log(`[Command /pokemon] pokemonName: "${pokemonName}" (length: ${pokemonName?.length || 0})`);
                if (pokemonName) {
                    if (pokemonData[pokemonName]) {
                        const data = pokemonData[pokemonName];
                        const embed = new EmbedBuilder()
                            .setTitle(pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1))
                            .setColor('#fffa68')
                            .addFields(
                                { name: 'Biomes', value: data.spawn.biomes.join(', '), inline: true },
                                { name: 'Moment', value: data.spawn.time, inline: true },
                                { name: 'Rareté', value: data.spawn.rarity, inline: true }
                            )
                            .setFooter({ text: 'Utilisez /pokemon pour voir tous les Pokémon !' })
                            .setTimestamp();
                        if (data.evolution) {
                            embed.addFields({
                                name: 'Évolution',
                                value: `Évolue en ${data.evolution.charAt(0).toUpperCase() + data.evolution.slice(1)} : ${data.method}`,
                                inline: true
                            });
                        } else if (data.evolutions) {
                            data.evolutions.forEach(evo => {
                                embed.addFields({
                                    name: 'Évolution',
                                    value: `Évolue en ${evo.name.charAt(0).toUpperCase() + evo.name.slice(1)} : ${evo.method}`,
                                    inline: true
                                });
                            });
                        } else {
                            embed.addFields({
                                name: 'Évolution',
                                value: `N’évolue pas : ${data.method}`,
                                inline: true
                            });
                        }
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle('Erreur')
                            .setDescription(`Désolé, aucune donnée pour **${pokemonName}**. Essayez un autre Pokémon (ex. Pikachu, Grookey) !`)
                            .setColor('#ff0000')
                            .setTimestamp();
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                } else {
                    await interaction.deferReply();
                    const itemsPerPage = 10;
                    const totalPages = Math.ceil(Object.keys(pokemonData).length / itemsPerPage);

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
                    const embed = await createPokemonEmbed(currentPage, itemsPerPage);
                    const message = await interaction.editReply({ embeds: [embed], components: [row] });

                    console.log('Message object:', message);

                    const filter = i => i.user.id === interaction.user.id && ['prev', 'next'].includes(i.customId);
                    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                    collector.on('collect', async i => {
                        console.log('[Button Collector] Interaction reçue:', i.customId, i.user.id);
                        try {
                            if (i.customId === 'prev' && currentPage > 0) {
                                currentPage--;
                            } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                                currentPage++;
                            }

                            prevButton.setDisabled(currentPage === 0);
                            nextButton.setDisabled(currentPage === totalPages - 1);

                            const newEmbed = await createPokemonEmbed(currentPage, itemsPerPage);
                            console.log('[Button Collector] Mise à jour de la page:', currentPage + 1);
                            await i.update({ embeds: [newEmbed], components: [row] });
                        } catch (error) {
                            console.error('[Button Collector] Erreur:', error);
                            collector.stop();
                        }
                    });

                    collector.on('end', async () => {
                        prevButton.setDisabled(true);
                        nextButton.setDisabled(true);
                        try {
                            await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] });
                        } catch (error) {
                            console.error('[Collector End] Erreur lors de la mise à jour finale:', error);
                        }
                    });
                }
            } else if (commandName === 'help') {
                const embed = new EmbedBuilder()
                    .setTitle('📖 Aide - Liste des Commandes')
                    .setDescription('Voici la liste de toutes les commandes disponibles pour explorer **Cobbleverse** :')
                    .setColor('#fffa68')
                    .setTimestamp()
                    .setFooter({ text: 'Cobbleverse Modpack | Basé sur Cobblemon' });

                embed.addFields(
                    { 
                        name: '`/evolve [pokemon]`', 
                        value: 'Vérifie comment un Pokémon évolue.\n**Exemple** : `/evolve pikachu`', 
                        inline: false 
                    },
                    { 
                        name: '`/locate [structure]`', 
                        value: 'Localise une structure ou catégorie dans Cobbleverse.\n**Exemple** : `/locate gym` ou `/locate Custom Village`', 
                        inline: false 
                    },
                    { 
                        name: '`/cobbleverse`', 
                        value: 'Obtient des informations sur le modpack Cobbleverse.', 
                        inline: false 
                    },
                    { 
                        name: '`/starter`', 
                        value: 'Affiche les Pokémon de départ dans Cobbleverse.', 
                        inline: false 
                    },
                    { 
                        name: '`/champions [champion]`', 
                        value: 'Liste tous les champions ou donne les détails d’un champion spécifique.\n**Exemple** : `/champions` ou `/champions Brock`', 
                        inline: false 
                    },
                    { 
                        name: '`/legendary [pokemon]`', 
                        value: 'Liste tous les Pokémon légendaires ou donne les détails d’un légendaire.\n**Exemple** : `/legendary` ou `/legendary Articuno`', 
                        inline: false 
                    },
                    { 
                        name: '`/pokemon [pokemon]`', 
                        value: 'Liste tous les Pokémon ou donne les détails d’un Pokémon spécifique.\n**Exemple** : `/pokemon` ou `/pokemon Grookey`', 
                        inline: false 
                    },
                    { 
                        name: '`/help`', 
                        value: 'Affiche cette liste de toutes les commandes disponibles.', 
                        inline: false 
                    }
                );

                await interaction.reply({ embeds: [embed] });
            }
        } else if (interaction.isAutocomplete()) {
            const commandName = interaction.commandName;
            if (commandName === 'locate') {
                const focusedValue = interaction.options.getFocused().toLowerCase();
                console.log(`[Autocomplete /locate] focusedValue: "${focusedValue}" (length: ${focusedValue.length})`);
                const structureNames = ['gym', 'village', 'legendary_structures', 'fossil_dig_site', 'other_structure'];
                for (const category of Object.values(structuresData.structures)) {
                    category.forEach(structure => {
                        if (structure.name && structure.name.length >= 1 && structure.name.length <= 100) {
                            structureNames.push(structure.name);
                        }
                    });
                }
                const filtered = structureNames
                    .filter(name => name.toLowerCase().includes(focusedValue) && name.length >= 1 && name.length <= 100)
                    .slice(0, 25);
                console.log(`[Autocomplete /locate] filtered options:`, filtered);
                await interaction.respond(
                    filtered.map(name => ({ name, value: name }))
                );
            } else if (commandName === 'pokemon') {
                const focusedValue = interaction.options.getFocused().toLowerCase();
                console.log(`[Autocomplete /pokemon] focusedValue: "${focusedValue}" (length: ${focusedValue.length})`);
                const pokemonNames = Object.keys(pokemonData).sort();
                const filtered = pokemonNames
                    .filter(name => name.toLowerCase().includes(focusedValue) && name.length >= 1 && name.length <= 100)
                    .slice(0, 25);
                console.log(`[Autocomplete /pokemon] filtered options:`, filtered);
                await interaction.respond(
                    filtered.map(name => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: name }))
                );
            }
        }
    } catch (error) {
        console.error(`[interactionCreate] Erreur:`, error);
        if (interaction.isCommand() || interaction.isAutocomplete()) {
            const embed = new EmbedBuilder()
                .setTitle('Erreur')
                .setDescription('Une erreur s’est produite lors du traitement de la commande. Veuillez réessayer.')
                .setColor('#ff0000')
                .setTimestamp();
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } else if (interaction.deferred) {
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                }
            } catch (replyError) {
                console.error('[interactionCreate] Erreur lors de la réponse:', replyError);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);