# Discord Bot for Foxhole

The Discord Bot for Foxhole is an open-source project aimed at simplifying operations and logistics management in the Foxhole game using Discord as a communication platform. This bot offers powerful features to help gaming teams coordinate their activities and enhance their gaming experience.

## Table of Contents

- [Features](#features)
- [Configuration](#configuration)
- [Installation](#installation)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)

## Features

The Discord Bot for Foxhole provides the following features:

- **Operation Management:** Create, track, and update operations in real-time to coordinate your team's activities.

- **Streamlined Logistics:** Automate resource distribution, inventory management, and the creation of logistics threads.

- **Customization:** Configure the bot to fit the specific needs of your Discord server.

## Configuration

Before using the Discord Bot for Foxhole, you will need to perform some configurations:

1. Invite the bot to your Discord server by following [Add to my server discord](https://discord.com/api/oauth2/authorize?client_id=1149421904428544081&permissions=17998060588096&scope=applications.commands%20bot).

2. Set up appropriate permissions for the bot's commands based on roles within your server.

3. Initialize the bot using the `/setup` command to specify the language and faction (colonial or warden) of the server.

## Installation

If you want to host your own instance of the Discord Bot for Foxhole, follow these steps:

1. Clone this GitHub repository to your machine.

2. Install dependencies using your preferred package manager (e.g., npm or yarn) by running `npm install`.

3. Configure the necessary environment variables in a `.env` file based on the provided `.env.dist` file.

4. Start the application using `npm run start`.

## Usage

Once the bot is configured on your Discord server, you can use its commands to create operations, manage logistics, and more. Check out [the wiki](https://github.com/Jokod/discord-bot-foxhole/wiki) for more details on available commands and features.

## Contribute

We welcome contributions from the community! If you'd like to contribute to the development of the Discord Bot for Foxhole, follow these steps:

1. Fork this GitHub repository.

2. Create a branch for your contribution: `git checkout -b my-contribution`.

3. Make your changes and test them.

4. Submit a pull request to the main branch of this repository.

5. Our team will review your contribution and merge it if approved.

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute it in accordance with the terms of this license.
