import { Client } from 'discord.js';
import express from 'express';
import * as topicUpdated from './events/topicUpdated';
import * as dealer from './interactions/dealer';
import * as echo from './interactions/echo';
import * as poll from './interactions/poll';
import * as roll from './interactions/roll';
import * as run from './interactions/run';
import * as who from './interactions/who';
import * as logo from './routes/logo';
import * as status from './routes/status';

// TODO handle mention caching

// TODO message command to ~~strike~~ a message

// TODO slash commands for anonymous send-and-reply
// TODO slash commands for macros
// TODO slash commands for tracking reactions etc

const client = new Client({ intents: [
    'GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS', 'GUILD_PRESENCES'
] });

void client.login(process.env.DISCORD_BOT_TOKEN);

client.setMaxListeners(25);

// const db = new Sequelize(process.env.DATABASE_URL ?? '', {
//     dialect: 'postgres',
//     logging: false,
//     dialectOptions: {
//         ssl: {
//             rejectUnauthorized: false
//         }
//     }
// });

// void db.sync();

if (process.env.NODE_ENV == 'development') {
    echo.register({ client });
}

roll.register({ client });
dealer.register({ client });
run.register({ client });
poll.register({ client });
who.register({ client });

topicUpdated.register({ client });

client.once('ready', () => {
    console.debug('Discord ready.');
});

const app = express();

status.register({ app });
logo.register({ app });

const PORT = Number(process.env.PORT ?? 80);

app.listen(PORT, () =>
    console.debug(`Express ready on port <${PORT}>.`)
);
