# Privacy Policy

**Last updated: March 11, 2026**

This Privacy Policy describes what data the Discord Bot for Foxhole ("the Bot") collects, why it collects it, and how it is stored and used. By adding the Bot to your Discord server, you acknowledge this policy.

---

## 1. Data Controller

The Bot is an open-source project maintained by its contributors. The hosted public instance is operated by the project maintainer. If you self-host the Bot, you become responsible for your own data handling.

---

## 2. Data We Collect

The Bot collects only the minimum data required to function. No personal messages, voice data, or unrelated user activity is ever collected or monitored.

### 2.1 Server Configuration

When a server administrator runs `/setup`, the following data is stored:

| Data | Purpose |
|------|---------|
| Discord Guild ID | Uniquely identifies the server |
| Chosen language | Displays the bot in the correct language |
| Chosen faction (warden/colonial) | Filters faction-specific game content |

### 2.2 Operations

When an operation is created via `/create_operation`:

| Data | Purpose |
|------|---------|
| Guild ID | Links the operation to the server |
| Creator's Discord User ID | Identifies the operation owner |
| Operation details (title, date, time, duration, description) | Stores the operation content |
| Operation status | Tracks whether the operation is active, started, or finished |

### 2.3 Logistics & Materials

When a material request is created via `/material create`:

| Data | Purpose |
|------|---------|
| Guild ID | Links the material to the server |
| Creator's Discord User ID | Identifies the requester |
| Assignee's Discord User ID (optional) | Tracks who is handling the request |
| Material details (name, quantity, priority, localization, status) | Stores the request content |

### 2.4 Stockpiles

When a stockpile is added via `/stockpile add`:

| Data | Purpose |
|------|---------|
| Guild ID | Links the stockpile to the server |
| Creator's Discord User ID | Identifies the stockpile owner |
| Stockpile details (region, city, name, 6-digit code) | Stores the stockpile entry |
| Expiry timer and reset timestamps | Manages the 2-day expiry system |

> **Note:** The 6-digit stockpile code is entered voluntarily by the user and is visible to members of the Discord server who can view the stockpile list channel.

### 2.5 Notifications

When a channel subscribes to notifications via `/notification subscribe`:

| Data | Purpose |
|------|---------|
| Guild ID | Links the subscription to the server |
| Channel ID | Identifies where to send notifications |
| Notification type | Determines which events trigger a notification |

### 2.6 Usage Statistics

The Bot automatically records anonymous usage statistics per server to help improve the service:

| Data | Purpose |
|------|---------|
| Guild ID | Identifies the server |
| Server name | For maintainer reference |
| Server creation date | Analytics |
| Bot join/leave dates | Tracks installation lifecycle |
| Total command count and breakdown per command | Understands feature usage |
| Member count (updated on each command) | Monitors server size at time of usage |
| Operation, material, and material validation counts | Feature-level analytics |

These statistics contain **no individual user data** and are used solely for maintenance and development purposes.

---

## 3. Data We Do Not Collect

The Bot does **not** collect:

- Message content (the Bot never reads your messages).
- Voice or video activity.
- Email addresses or any account information beyond Discord IDs.
- Data from servers it is not installed in.
- Any data beyond what is described in Section 2.

---

## 4. How Data Is Stored

All data is stored in a **MongoDB** database. Access is restricted to the Bot's runtime environment and the project maintainer.

If you self-host the Bot, the data is stored in your own MongoDB instance and is entirely under your control.

---

## 5. Data Retention

| Data type | Retention |
|-----------|-----------|
| Server configuration | Until the Bot is removed from the server or the data is deleted manually |
| Operations, materials | Until deleted by the user or server admin |
| Stockpiles | Until permanently removed via `/stockpile cleanup` or `/stockpile deleteall` |
| Notification subscriptions | Until unsubscribed or the server removes the Bot |
| Usage statistics | Retained indefinitely for analytics; no personal data is included |

When the Bot leaves a server, the bot leave date is recorded in the stats entry. Server configuration and feature data are not automatically deleted, as they may be needed if the Bot is re-invited.

---

## 6. Third-Party Services

The Bot queries the following external APIs to provide live game data:

- **Steam API** — retrieves the current number of players online in Foxhole. No user data is sent.
- **Foxhole War API** — retrieves war status, active maps, and war reports. No user data is sent.

These services operate under their own privacy policies. The Bot does not share any collected data with these services.

---

## 7. Data Sharing

We do not sell, rent, or share any collected data with third parties.

Data may only be disclosed if required by applicable law.

---

## 8. Your Rights

As a server administrator, you can:

- **Delete operations and materials** using the provided bot commands.
- **Remove stockpiles** using `/stockpile cleanup` or `/stockpile deleteall`.
- **Unsubscribe from notifications** using `/notification unsubscribe`.
- **Remove the Bot** from your server at any time, which stops all further data collection.

To request deletion of all data associated with your server from the hosted instance, please open an issue on the [GitHub repository](https://github.com/Jokod/discord-bot-foxhole).

---

## 9. Self-Hosting

If you choose to self-host the Bot using the open-source code available on [GitHub](https://github.com/Jokod/discord-bot-foxhole), you are fully responsible for the data you collect, store, and process. This Privacy Policy applies only to the hosted public instance.

---

## 10. Changes to This Policy

We may update this Privacy Policy at any time. Continued use of the Bot after changes are published constitutes your acknowledgement of the revised policy.

---

## 11. Contact

For privacy-related questions or data deletion requests, please open an issue on the [GitHub repository](https://github.com/Jokod/discord-bot-foxhole).
