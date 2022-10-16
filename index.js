const { Client, Intents } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource
} = require("@discordjs/voice");
const play = require("play-dl");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
});
const dotenv = require("dotenv");
dotenv.config();

const TOKEN = process.env.TOKEN;
const PREFIX = "!";

const player = createAudioPlayer();

let server = {
    connection: null,
    dispatcher: null,
    queue: [],
    playing: false
};

client.on("ready", () => {
    console.log("Online");
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (!message.content.startsWith(PREFIX)) return;

    const addMusic = (url) => {
        if (server.playing) {
            server.queue.push(url);
            message.channel.send(`${url} foi adicionado a fila!`);
        } else {
            server.queue.push(url);
            playMusic();
        }
    };

    let command = message.content.split(" ")[0];
    command = command.slice(PREFIX.length);

    let args = message.content.split(" ").slice(1);
    let argsString = args.join(" ");

    if (command === "join") {
        if (message.member.voice.channel) {
            server.connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            });
        } else {
            message.channel.send(
                "Você precisa estar num canal de voz seu burro!"
            );
        }
    }

    if (command === "leave") {
        if (server.connection) {
            server.connection.destroy();
            server.connection = null;
            server.dispatcher = null;
        } else {
            message.channel.send(
                "Você precisa estar num canal de voz seu burro!"
            );
        }
    }

    if (command === "play") {
        if (message.member.voice.channel) {
            if (argsString.length === 0) {
                message.channel.send(
                    "Você precisa me dizer o link ou o nome do vídeo animal!"
                );
            }
            if (!server.connection) {
                server.connection = server.connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator
                });
            }
            if (argsString.startsWith("https")) {
                if (argsString.includes("list")) {
                    const playlist = await play.playlist_info(argsString, {
                        incomplete: true
                    });
                    playlist.videos.forEach(async (video) => {
                        addMusic(video.url);
                    });
                } else {
                    addMusic(argsString);
                }
            } else {
                let video = await play.search(argsString, {
                    limit: 1
                });
                addMusic(video[0].url);
            }
        } else {
            message.channel.send(
                "Você precisa estar num canal de voz seu burro!"
            );
        }
    }

    if (command === "skip" || command === "next") {
        if (message.member.voice.channel) {
            player.stop();
        } else {
            message.channel.send(
                "Você precisa estar num canal de voz seu burro!"
            );
        }
    }

    if (command === "pause") {
        if (message.member.voice.channel) {
            player.pause();
        } else {
            message.channel.send(
                "Você precisa estar num canal de voz seu burro!"
            );
        }
    }

    if (command === "resume") {
        if (message.member.voice.channel) {
            player.unpause();
        } else {
            message.channel.send(
                "Você precisa estar num canal de voz seu burro!"
            );
        }
    }

    if (command === "clear") {
        server.queue = [];
        message.channel.send("Fila limpa!");
    }

    if (command === "queue") {
        if (server.queue.length === 0) {
            message.channel.send("A fila está vazia!");
        } else {
            message.channel.send(
                `A fila está com ${server.queue.length} músicas!`
            );
        }
    }
});

const playMusic = async () => {
    if (server.playing) {
        return;
    }
    const music = server.queue[0];
    let stream = await play.stream(music);
    server.playing = true;
    server.connection.subscribe(player);
    server.dispatcher = player.play(
        createAudioResource(stream.stream, { inputType: stream.type })
    );
    player.addListener("stateChange", (oldOne, newOne) => {
        if (newOne.status == "idle") {
            server.queue.shift();
            server.playing = false;
            if (server.queue.length > 0) {
                playMusic();
            } else {
                server.dispatcher = null;
            }
        }
    });
};

client.login(TOKEN);
