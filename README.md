# radiobot-jp
A simple Discord bot that lets you play live community radio stations from Japan.

## Features
- Play live radio
- See radio station list (lots more to be added)
- See more detailed info on currently playing stations
- Auto disconnects when there are no listeners.

## Requirements
- Node
- NPM
- FFMPEG

## Installation
```bash
# Clone the repository
git clone https://github.com/impossibro/radiobot-jp.git

# Install the dependencies
npm install
```

## Configuration
After installation you'll need to enter your bot token into the `config-sample.json` file as well as set the bot command prefix there. After that rename the file to `config.json` and you'll be good to go.

### Starting the bot
```bash
node index.js
```

### Common issues
Just make sure FFMPEG is installed and all the dependencies are up to date. This should usually solve any issues.

## Author
 Kavinesh Kumar
