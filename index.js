//dependencies
const Discord = require("discord.js");
const Config = require("./config.json");
const Stations = require("./stations.json");
const { Menu } = require("discord.js-menu");

//get stations from CSRA and/or JCBA

//init
const client = new Discord.Client();
client.login(Config.BOT_TOKEN);

//bot command prefix
const prefix = Config.BOT_PREFIX;

const radioBot = {
    connection: null,
    dispatcher: null,
    isPlaying: false,
    validStation: false,
    alone: false,
    //streaminfo
    stationName: "",
    stationRegion: "",
    stationFreq: ""
};


//Primary Command Handler
client.on("message", async function(msg) {

    //ignore dm's, bot's own messages and messages wtihout the prefix
    if(!msg.guild) return;
    if(msg.author.bot) return;
    if(!msg.content.startsWith(prefix)) return;

    const commandBody = msg.content.slice(prefix.length);
    const args = commandBody.split(" ");
    const command = args.shift().toLowerCase();

    switch(command) {
        case "play":
        case "p":
        case "listen":
            startRadio(msg, args[0]);
            break;

        case "stop":
        case "s":
            stopPlaying("msg");
            break;

        case "disconnect":
        case "dc":
            disconnectRadio(msg);
            break;

        case "np":
            printStationInfo(msg);
            break;
        
        case "stations":
            let stationList = new Menu(msg.channel, msg.author.id, menuBuilder(msg), 20000)
            stationList.start();
            break;

        case "help":
            printHelpMenu(msg);
    }
});


//Auto-disconnect when no listeners (janky implementation)
client.on("voiceStateUpdate", async function(oldState, newState) {

    var memberCount = 2;
    
    if(radioBot.isPlaying) {
        try {
            memberCount = 0;
            radioBot.connection.channel.members.each(users => memberCount++);
        } catch (err) {
            console.log(err);
        }
    }
    
    if(memberCount > 1) {
        radioBot.isAlone = false;
    } else {
        radioBot.isAlone = true;
    }
    disconnectWhenAlone();
});


async function startRadio(message, command) {

    if(!message.member.voice.channel) {
        message.channel.send("You need to be in a voice channel to listen to radio.");
        return;
    }
    
    if(!radioBot.isPlaying && message.member.voice.channel) {
        selectStation(message, command);
    }

    if(radioBot.isPlaying) {
        if(message.member.voice.channel === radioBot.connection.channel) {
            selectStation(message, command);
        } else {
            message.channel.send("You need to be in the same voice channel to listen to radio.");
        }
    }
}


function findStationURL(message, station) {
    radioBot.validStation = false;
    var found = false;
    for (var x in Stations) {
        if(Stations[x].id === station) {
            found = true;
            radioBot.validStation = true;
            radioBot.stationName = Stations[x].name;
            radioBot.stationRegion = Stations[x].location;
            radioBot.stationFreq = Stations[x].frequency;
            return Stations[x].url;
        }
    }
    if(!found) {
        message.channel.send("Could not find radio station.");
        radioBot.validStation = false;
    }
}


async function selectStation(message, station) {
    stationURL = findStationURL(message, station);
    if(radioBot.validStation) {
        try {
            radioBot.connection = await message.member.voice.channel.join();
            radioBot.dispatcher = radioBot.connection.play(stationURL);
            radioBot.isPlaying = true;
            message.channel.send("Now playing " + radioBot.stationName + "!");
            client.user.setActivity(radioBot.stationName, { type: 'LISTENING'});
        } catch (err) {
            console.log(err);
            message.channel.send("An error occurred.")
        }
    }
}


function printStationInfo(message)
{
    if(radioBot.isPlaying) {
        const nowPlaying = new Discord.MessageEmbed()
            .setColor("#faffff")
            .setTitle("Currently Playing")
            .addFields([
                {name: "📻 Station", value: radioBot.stationName, inline: true},
                {name: '\u200B', value: '\u200B', inline: true},
                {name: "📡 Frequency", value: radioBot.stationFreq, inline: true},
                {name: "🗾 Region", value: radioBot.stationRegion}
            ]);
        message.channel.send(nowPlaying);
    } else {
        message.channel.send("Radio is not playing.");
    }
}


function menuBuilder(message) {
    var stationEmbedFields = [];

    for (var x in Stations) {
        var station = {name: (Stations[x].id), value: (Stations[x].name + "\n" + Stations[x].frequency + " - " + Stations[x].location)};
        stationEmbedFields.push(station);
    }

    var counter = 0;
    var groupedEmbedFieldsTemp = []
    var groupedEmbedFields = []

    while (stationEmbedFields.length > 0)
    {
        groupedEmbedFieldsTemp.push(stationEmbedFields.pop());
        counter++;
        //change the counter === value to change the number of listed stations per page.
        if(counter === 5)
        {
            groupedEmbedFields.push(groupedEmbedFieldsTemp.splice(0,groupedEmbedFieldsTemp.length));
            counter = 0;
        }    
    }

    //add the leftover stations to the array of arrays
    if(groupedEmbedFieldsTemp.length > 0) {
        groupedEmbedFields.push(groupedEmbedFieldsTemp);
    }
    
    var embedObjects = [];

    for (var x in groupedEmbedFields) {
        var pageNum = parseInt(x) + 1;
        var stationPage = new Discord.MessageEmbed()
            .setColor("#faffff")
            .setTitle("Radio Stations")
            .addFields(groupedEmbedFields[x])
            .setFooter("Page " + pageNum + "/" + groupedEmbedFields.length);
            embedObjects.push(stationPage);
    }

    var menuPages = [];

    for (var x in embedObjects) {
        var menuPage = {
            name: "page" + x,
            content: embedObjects[x],
            reactions: {
                "◀️": "previous",
                //"⛔": "delete",
                "▶️": "next"
            }
        }
        menuPages.push(menuPage);
    }
    return menuPages;
}

function printHelpMenu(message) {
    const helpMenu = new Discord.MessageEmbed()
        .setColor("#faffff")
        .setTitle("Command List")
        .setFooter("use the prefix " + Config.BOT_PREFIX + " along with the commands below (e.g. '" + Config.BOT_PREFIX + "stop')")
        .addFields([
            {name: "listen / play / p <station name>", value: "plays the selected station"},
            {name: "stop / s", value: "stops playing the curent radio"},
            {name: "disconnect / dc", value: "disconnects the bot from the voice channel"},
            {name: "np", value: "displays info on the currently playing station"},
            {name: "stations", value: "displays the station list"},
            {name: '\u200B', value: '\u200B'}
        ]);
    message.channel.send(helpMenu);
}


function stopPlaying(message) {
    if(canManagePlayback(message)) {
        try {
            radioBot.dispatcher.destroy();
            radioBot.isPlaying = false;
            radioBot.validStation = false;
            message.channel.send("Stopped playing.");
        } catch(err) {
            console.log(err);
        }
    } else {
        message.channel.send("You need to be in the same voice channel or have permission to stop the radio.")
    }

}

function canManagePlayback(message) {
    var permission = false;

    if (radioBot.isPlaying) {
        if(message.member.voice.channel === radioBot.connection.voice.channel) {
            permission = true;
        }
    }

    if(message.member.roles.cache.some(role => role.name === "Admin")) {
        permission = true;
    }

    if(message.member.roles.cache.some(role => role.name === "Mod")) {
        permission = true;
    }

    if(message.member.roles.cache.some(role => role.name === "DJ")) {
        permission = true;
    }

    return permission;

}

function disconnectRadio(message) {
    if(!radioBot.isPlaying) {
        try {
            message.member.voice.channel.leave();
            message.channel.send("Disconnected from " + message.member.voice.channel.name);
        } catch (err) {
            console.log(err);
        }
    } else {
        try {
            if(canManagePlayback(message)) {
                radioBot.connection.disconnect();
                radioBot.isPlaying = false;
                message.channel.send("Disconnected from " + message.member.voice.channel.name);
            } else {
                message.channel.send("You need to be in the same voice channel or have permission to disconnect the radio.")
            }
        } catch(err) {
            console.log(err);
        }
    }
}

async function disconnectWhenAlone() {
    if(radioBot.isAlone) {
        await sleep(60000);
        if(radioBot.isAlone) {
            try {
                radioBot.connection.disconnect();
                radioBot.isPlaying = false;
            } catch(err) {
                console.log(err);
            }
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }   