# Contributing

Thank you for your interest in contributing to the Discord Bot for Foxhole! This document explains how to set up the project locally and how to submit quality contributions.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Adding a Slash Command](#adding-a-slash-command)
- [Adding a Button Interaction](#adding-a-button-interaction)
- [Adding Materials](#adding-materials)
- [Adding a Translation Key](#adding-a-translation-key)
- [Tests](#tests)
- [Code Style](#code-style)
- [Submitting a Pull Request](#submitting-a-pull-request)

---

## Getting Started

### Prerequisites

- Node.js v20.x or higher
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
git clone https://github.com/Jokod/discord-bot-foxhole.git
cd discord-bot-foxhole
npm install
cp .env.dist .env
```

Edit `.env` and fill in the required values:

| Variable | Description |
|----------|-------------|
| `TOKEN` | Your Discord bot token |
| `CLIENT_ID` | Your Discord application ID |
| `MONGODB_URL` | MongoDB connection string |
| `MONGODB_NAME` | Database name (e.g. `foxhole-bot`) |
| `OWNER` | Your Discord user ID |
| `TEST_GUILD_ID` | Your test server ID |
| `APP_ENV` | `dev` for development, `prod` for production |

### Start the bot

```bash
npm run dev     # Development (auto-reload with nodemon)
npm run start   # Production
```

---

## Project Structure

```
.
├── bot.js                      # Entry point
├── events/                     # Discord event handlers
├── interactions/
│   ├── buttons/                # Button interaction handlers
│   ├── embeds/                 # Embed builders
│   ├── modals/                 # Modal handlers
│   ├── select-menus/           # Select menu handlers
│   └── slash/                  # Slash command handlers
│       ├── logistics/
│       ├── misc/
│       ├── notification/
│       ├── operation/
│       ├── server/
│       └── stockpile/
├── data/
│   ├── models.js               # Mongoose models
│   └── materials/              # Material JSON files by category
├── languages/                  # Translation files (en, fr, ru, zh-cn)
├── utils/                      # Shared utilities
├── messages/                   # Default error/fallback messages
└── __tests__/                  # Unit tests (mirrors source structure)
```

---

## Development Workflow

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes.

3. Run the linter and tests before committing:
   ```bash
   npm run lint
   npm test
   ```

4. Fix any lint errors (or auto-fix them with `npm run fix`).

5. Push your branch and open a Pull Request.

---

## Adding a Slash Command

1. Create a new file in the appropriate `interactions/slash/<category>/` folder.

2. Export an object with the following shape:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    init: true, // set to true if the command requires server initialization (/setup)

    data: new SlashCommandBuilder()
        .setName('my_command')
        .setDescription('Does something useful.'),

    async execute(interaction) {
        // your logic here
    },
};
```

3. The command is automatically loaded at startup — no manual registration needed.

4. If the command requires the server to be initialized (i.e. `/setup` must have been run), set `init: true`.

---

## Adding a Button Interaction

1. Create a new file in `interactions/buttons/<category>/`.

2. Export an object with the following shape:

```js
module.exports = {
    id: 'my_button_id', // must match the customId (or its prefix before the first '-')

    async execute(interaction) {
        // your logic here
    },
};
```

3. For dynamic IDs (e.g. `stockpile_reset-42`), use the prefix as the `id` (e.g. `stockpile_reset`) and parse the rest from `interaction.customId`.

4. If the interaction may take more than 3 seconds to process, call `await interaction.deferUpdate()` or `await interaction.deferReply()` at the start.

---

## Adding Materials

Materials are stored as JSON files in `data/materials/<category>/`.

Each entry must follow this structure:

```json
{
  "faction": ["colonial", "warden"],
  "itemName": "Item Name",
  "itemDesc": "Item description",
  "itemCategory": "category"
}
```

- `faction` — use `["colonial"]`, `["warden"]`, or `["colonial", "warden"]` for shared items.
- Items within a file must be sorted **alphabetically** by `itemName`.
- Run `npm test` after adding items to validate the structure.

---

## Adding a Translation Key

All translation keys are defined in `languages/en.js` (the reference file). Every other language file must contain the same keys.

1. Add your key to `languages/en.js`:
   ```js
   MY_NEW_KEY: 'English text here',
   ```

2. Add the translated value to `languages/fr.js`, `languages/ru.js`, and `languages/zh-cn.js`.

3. Use the key in code via the `Translate` helper:
   ```js
   const translations = new Translate(client, guildId);
   translations.translate('MY_NEW_KEY');
   // With parameters:
   translations.translate('MY_KEY_WITH_PARAM', { name: 'value' });
   ```

---

## Tests

Unit tests live in `__tests__/` and mirror the source structure. The project uses **Jest**.

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

When adding new features, please add or update the corresponding test file. Tests should mock all external dependencies (database, Discord API, translations) and test the handler logic in isolation.

---

## Code Style

The project uses **ESLint** with the configuration defined in `eslint.config.js`. Key conventions:

- Tabs for indentation.
- Single quotes for strings.
- Always use `async/await` over raw Promise chains.
- Handle interaction errors explicitly: check `interaction.replied` or `interaction.deferred` before calling `reply` or `followUp`.
- Do not leave `console.log` calls in production code; use `console.error` only for genuine errors.

Run the linter:

```bash
npm run lint    # Check
npm run fix     # Auto-fix
```

---

## Submitting a Pull Request

- Target the `main` branch.
- Keep your PR focused: one feature or fix per PR.
- Write a clear description of what the PR does and why.
- Make sure all tests pass and there are no lint errors.
- If your PR adds or changes user-facing behaviour, update the relevant section in `README.md`.

We review all contributions and will provide feedback as soon as possible. Thank you!
