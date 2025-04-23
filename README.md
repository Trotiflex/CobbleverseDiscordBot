# CobbleverseDiscordBot

CobbleverseDiscordBot is a Discord bot designed for the **Cobbleverse** modpack, a Pokémon-inspired Minecraft mod based on Cobblemon. The bot provides useful commands to help players explore the Cobbleverse world, including Pokémon evolution details, structure locations, starter Pokémon lists, champion information, and legendary Pokémon spawns. This bot is intended to be run locally on your machine.

## Features

- **Pokémon Evolution**: Use `/evolve <pokemon>` to check how a Pokémon evolves and the required method (e.g., level, item).
- **Structure Locator**: Use `/locate <structure>` to find Cobbleverse structures like Custom Villages, Arenas, or Sky Pillar, with biome details and in-game instructions.
- **Starter Pokémon**: Use `/starter` to list all starter Pokémon available across generations in Cobbleverse.
- **Champions Info**: Use `/champions [champion]` to view details about Cobbleverse champions, including their order, biome, and level cap.
- **Legendary Pokémon**: Use `/legendary [pokemon]` to get spawn locations and evolution details for legendary Pokémon, with pagination for the full list.
- **Cobbleverse Overview**: Use `/cobbleverse` to learn about the modpack, with links to the wiki and Discord server.

## Prerequisites

To run the bot locally, you'll need:
- **Node.js**: Version 20 (LTS) or later. Download from [nodejs.org](https://nodejs.org).
- **Discord Developer Account**: Create a bot on the [Discord Developer Portal](https://discord.com/developers/applications).
- **Git**: Installed for cloning the repository. Download from [git-scm.com](https://git-scm.com).

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Trotiflex/CobbleverseDiscordBot.git
   cd CobbleverseDiscordBot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   - Create a `.env` file in the root directory.
   - Add the following:
     ```env
     DISCORD_TOKEN=your_discord_bot_token
     CLIENT_ID=your_bot_client_id
     GUILD_ID=your_server_id
     ```
   - Obtain these values from the Discord Developer Portal:
     - `DISCORD_TOKEN`: Bot token from the "Bot" tab.
     - `CLIENT_ID`: Application ID from the "General Information" tab.
     - `GUILD_ID`: Right-click your server in Discord, select "Copy ID" (enable Developer Mode in Discord settings).

4. **Invite the Bot to Your Server**:
   - In the Discord Developer Portal, go to your bot's application.
   - Navigate to "OAuth2" > "URL Generator".
   - Select the `bot` scope and permissions: `Send Messages`, `Embed Links`, `Read Messages/View Channels`.
   - Copy the generated URL and open it in a browser.
   - Select your server and authorize the bot to join.

5. **Run the Bot**:
   ```bash
   node index.js
   ```
   - Keep the terminal open to keep the bot running locally.

## Usage

Once the bot is running locally and added to your Discord server, try these slash commands:
- `/evolve skitty`: Shows that Skitty evolves into Delcatty using a Moon Stone.
- `/locate Custom Village`: Provides biome details and instructions to locate a Custom Village.
- `/starter`: Lists all starter Pokémon (e.g., Bulbasaur, Sprigatito).
- `/champions Brock`: Displays details about the champion Brock (order, biome, level cap).
- `/legendary Articuno`: Shows Articuno's spawn location and evolution info.
- `/cobbleverse`: Provides an overview of the Cobbleverse modpack with links.

## Project Structure

- `index.js`: Main bot script, handling Discord.js logic and slash commands.
- `pokemon_data.json`: Contains Pokémon evolution data (e.g., Skitty, Feebas, Sprigatito).
- `cobbleverse_structures.json`: Lists Cobbleverse structures with biomes and descriptions.
- `legendaries.json`: Contains legendary Pokémon spawn and evolution data.
- `cobbleverse_champions.json`: Lists champions with their details.
- `.env`: Stores sensitive information (not tracked in Git).
- `.gitignore`: Ignores `.env` and `node_modules`.

## Contributing

Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Make your changes and commit:
   ```bash
   git commit -m "Add your feature"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request on GitHub.

Please ensure your code follows the existing style and includes appropriate comments.


## Contact

For issues, suggestions, or support:
- Open an issue on [GitHub](https://github.com/Trotiflex/CobbleverseDiscordBot/issues).
- Join the Cobbleverse Discord server (use `/cobbleverse` command for the invite link).

---

Happy catching in Cobbleverse! 🐾
