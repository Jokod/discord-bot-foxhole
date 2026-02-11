# Discord Bot for Foxhole

The Discord Bot for Foxhole is an open-source project aimed at simplifying operations and logistics management in the Foxhole game using Discord as a communication platform. This bot offers powerful features to help gaming teams coordinate their activities and enhance their gaming experience.

## Table of Contents

- [Features](#features)
- [Configuration](#configuration)
- [Data collected](#data-collected)
- [Installation](#installation)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)

## Features

The Discord Bot for Foxhole provides the following features:

- **Operation Management:** Create, track, and update operations in real-time to coordinate your team's activities.

- **Streamlined Logistics:** Automate resource distribution, inventory management, and the creation of logistics threads.

- **Advanced Material Categorization:** Materials are organized into main categories and subcategories for easy navigation:
  - **Utilities** (Tools, Field Equipment, Mounted Equipment, Medical, Uniforms, Outfits)
  - **Infantry Weapons** (Small Arms, Melee Weapons, Machine Guns, Heavy Arms, Grenades, Launchers, Mortar)
  - **Ammunition** (Light Ammo, Tank Ammo, Aircraft Ammo, Artillery Ammo, Misc Ammo, Flamethrower Ammo)
  - **Resources** (Basic Materials, Explosive Materials, Heavy Explosive Materials, Refined Materials, Gravel)
  - **Vehicles** (All vehicle types)

- **Multi-language Support:** Available in English, French, Russian, and Chinese (Simplified).

- **Customization:** Configure the bot to fit the specific needs of your Discord server.

## Configuration

Before using the Discord Bot for Foxhole, you will need to perform some configurations:

1. Invite the bot to your Discord server by following [Add to my server discord](https://discord.com/api/oauth2/authorize?client_id=1149421904428544081&permissions=328565001280&scope=applications.commands%20bot).

2. Set up appropriate permissions for the bot's commands based on roles within your server.

3. Initialize the bot using the `/setup` command to specify the language and faction (colonial or warden) of the server.

## Data collected

When the bot is installed on a server, it stores **usage statistics** in the database (MongoDB) to improve the service and understand how the bot is used. No personal data (user IDs, messages, etc.) is collected beyond what is strictly necessary for the bot to function.

### Per-server statistics (Stats)

| Data | Description |
|------|-------------|
| **Server ID** | Discord guild identifier |
| **Server name** | Name of the server |
| **Server creation date** | When the Discord server was created |
| **Bot join date** | When the bot was added to the server |
| **Last command date** | Date of the last slash command executed |
| **First command date** | Date of the first slash command on the server |
| **Total command count** | Total number of slash commands executed |
| **Command breakdown** | Number of uses per command (e.g. `/help`, `/logistics`, `/github`) |
| **Last command per type** | Last usage date for each command |
| **Member count** | Total number of members in the server (updated on each command) |
| **Operations created** | Number of operations created via the bot |
| **Materials added** | Number of materials added to logistics |
| **Materials validated** | Number of materials marked as validated |

These statistics are stored in a `Stats` collection and are used only for analytics and maintenance. They are not shared with third parties. If you self-host the bot, this data remains in your own database.

## Installation

If you want to host your own instance of the Discord Bot for Foxhole, follow these steps:

### Prerequisites

- Node.js v16.11.0 or higher (v20.x recommended)
- MongoDB (local or MongoDB Atlas)
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Setup Steps

1. **Clone this GitHub repository** to your machine:
   ```bash
   git clone https://github.com/Jokod/discord-bot-foxhole.git
   cd discord-bot-foxhole
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.dist .env
   ```
   
   Edit `.env` and fill in the required values:
   - `TOKEN`: Your Discord bot token
   - `CLIENT_ID`: Your Discord application ID
   - `MONGODB_URL`: MongoDB connection URL
   - `MONGODB_NAME`: Database name (e.g., "foxhole-bot")
   - `OWNER`: Your Discord user ID
   - `TEST_GUILD_ID`: Your test server ID (for development)
   - `APP_ENV`: Set to `dev` for development, `prod` for production

4. **Invite the bot to your server**:
   
   Use this URL (replace `YOUR_CLIENT_ID` with your actual Client ID):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=328565001280&scope=bot%20applications.commands
   ```
   
   ⚠️ **Important**: Make sure to include both `bot` and `applications.commands` scopes!

5. **Start the application**:
   ```bash
   npm run start      # Production
   npm run dev        # Development (with auto-reload)
   # or
   make start         # Production
   make dev           # Development
   ```

### Troubleshooting

If you encounter any issues during setup or runtime, please refer to the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file for common problems and solutions.

For detailed information about recent updates and changes, see [MIGRATION.md](MIGRATION.md).

## Usage

Once the bot is configured on your Discord server, you can use its commands to create operations, manage logistics, and more. Check out [the wiki](https://github.com/Jokod/discord-bot-foxhole/wiki) for more details on available commands and features.

### Commands overview

#### Slash commands – General / utilities

- `/help [command]` – List all slash commands or show detailed help for a specific command (supports localized names).
- `/github` – Get the bot GitHub repository link (ephemeral).

#### Slash commands – Server configuration

- `/setup lang:<en|fr|ru|zh-CN> camp:<warden|colonial>` – Initialize server configuration (must be run once per server).
- `/server infos` – Display the current server configuration (language and camp).
- `/server lang lang:<en|fr|ru|zh-CN>` – Change the bot language for the server.
- `/server camp camp:<warden|colonial>` – Change the configured camp (faction) for the server.

#### Slash commands – Foxhole live data

- `/foxhole info` – Show current online players and current war stats (Steam API + War API).
- `/foxhole map` – Get a link to the Foxhole live map & stats website.
- `/war status` – Detailed current war status from the War API.
- `/war maps` – List all active World Conquest maps from the War API.
- `/war report map:<MapName>` – War report for a specific map (enlistments, casualties, day of war).

#### Slash commands – Operations & logistics

- `/create_operation title:<TITLE>` – Open a modal to create a new operation (date, time, duration, description).
- `/logistics help` – List all `logistics` subcommands.
- `/logistics resume operation:<OperationId>` – Show a summary of all logistics groups of an operation.
- `/logistics list group:<GroupId>` – List all materials of a given logistics group.
- `/logistics material material:<MaterialId>` – Show detailed information about a specific material.

#### Slash commands – Materials

- `/material help` – List all `material` subcommands.
- `/material create [group:<GroupId>]` – Create a new material entry (with interactive buttons).
- `/material delete material:<MaterialId>` – Delete a material.
- `/material info material:<MaterialId>` – Show detailed information about a material.

#### Slash commands – Stockpiles

Stockpile codes (seaport/depot) are scoped per server and per channel. Only the creator can remove or restore a given stock; the list is grouped by region and city with a 2-day reset timer.

- `/stockpile help` – Show available stockpile subcommands.
- `/stockpile add` – Open a form to add a stockpile (region, city, name, 6-digit code).
- `/stockpile remove id:<Id>` – Mark a stockpile as deleted (creator only).
- `/stockpile restore id:<Id>` – Restore a deleted stockpile (creator only).
- `/stockpile list` – Display stockpiles by region and city (stock, code, expiry).
- `/stockpile reset id:<Id>` – Reset a stockpile’s timer to 2 days.
- `/stockpile cleanup` – Permanently remove deleted stockpiles in this channel (requires **Manage Channels**).
- `/stockpile deleteall` – Permanently delete all stockpiles on this server (requires **Manage Server** permission).

#### Slash commands – Notifications

Subscribe channels to notifications. Requires **Manage Channels** to subscribe or unsubscribe.

- `/notification subscribe type:<Type>` – Subscribe this channel.
- `/notification unsubscribe type:<Type>` – Unsubscribe this channel.
- `/notification list` – List channels subscribed to notifications on this server.

| Type | Trigger / interval | Details |
|------|--------------------|---------|
| **Stockpile activity** | On each action | Sent immediately when a user **adds**, **removes**, **restores** or **resets** a stock. |
| **Stockpile expiring soon** | Check at startup + **every 5 min** | One notification per stock for the **closest** due interval (12h, 6h, 3h, 2h, 1h, 30min).|

The two types are independent: subscribing to *Stockpile activity* does not enable expiry reminders; you must also subscribe to *Stockpile expiring soon*.

## Project Structure

### Materials Organization

Materials are organized in a hierarchical structure:

```
data/materials/
├── utilities/
│   ├── tools.json
│   ├── field_equipment.json
│   ├── mounted_equipment.json
│   ├── medical.json
│   ├── uniforms.json
│   └── outfits.json
├── infantry_weapons/
│   ├── small_arms.json
│   ├── melee_weapons.json
│   ├── machine_guns.json
│   ├── heavy_arms.json
│   ├── grenades.json
│   ├── launchers.json
│   └── mortar.json
├── ammunition/
│   ├── light_ammo.json
│   ├── tank_ammo.json
│   ├── aircraft_ammo.json
│   ├── artillery_ammo.json
│   ├── misc_ammo.json
│   └── flamethrower_ammo.json
├── resources/
│   ├── bmat.json
│   ├── emat.json
│   ├── hemat.json
│   ├── rmat.json
│   └── gravel.json
└── vehicles/
    └── vehicles.json
```

Each JSON file contains an array of materials with the following structure:
```json
{
  "faction": ["colonial", "warden"],
  "itemName": "Item Name",
  "itemDesc": "Item description",
  "itemCategory": "category"
}
```

### Adding New Materials

To add new materials to the bot:

1. Navigate to the appropriate category folder in `data/materials/`
2. Open the relevant subcategory JSON file
3. Add your material following the structure above
4. Ensure materials are sorted alphabetically by `itemName`
5. Run tests to validate: `npm test`

## Testing

This project includes unit tests to ensure code quality and reliability.

### Run tests

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Or using make
make test              # Run all tests
make test-watch        # Run tests in watch mode
make test-coverage     # Run tests with coverage
```

### Test Coverage

The test suite includes:
- **Material Structure Tests**: Validates the organization and integrity of material categories
- **Translation Tests**: Ensures all categories and subcategories are properly translated in all supported languages
- **Data Model Tests**: Tests database schema and validation
- **Utility Tests**: Tests helper functions and utilities

For more information about testing, see [TESTING.md](TESTING.md).

## Contribute

We welcome contributions from the community! If you'd like to contribute to the development of the Discord Bot for Foxhole, follow these steps:

1. Fork this GitHub repository.

2. Create a branch for your contribution: `git checkout -b my-contribution`.

3. Make your changes and test them.

4. Submit a pull request to the main branch of this repository.

5. Our team will review your contribution and merge it if approved.

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute it in accordance with the terms of this license.
