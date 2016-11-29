#!/bin/sh
mkdir -p data/log
mkdir -p ui/css/fonts
mkdir -p /tmp/lamassu-fonts
rm /tmp/lamassu-fonts/* -rf

echo

if [ ! -d "node_modules" ]; then
    echo "node.js dependencies not yet installed.. installing them now."
    npm install
    if [ ! -h "jasmine" ]; then 
        ln -s ./node_modules/jasmine/bin/jasmine.js jasmine 
    fi
    if [ ! -h "istanbul" ]; then 
        ln -s ./node_modules/istanbul/lib/cli.js istanbul 
    fi
else
    echo "node_modules folder found. skipping dependency install."
fi

echo "Downloading fonts..."
curl -# -L https://github.com/adobe-fonts/source-sans-pro/archive/2.010R-ro/1.065R-it.zip > /tmp/lamassu-fonts/source-sans-pro.zip
curl -# -L https://github.com/adobe-fonts/source-code-pro/archive/1.017R.zip > /tmp/lamassu-fonts/source-code-pro.zip
echo "Installing fonts in lamassu-machine..."
unzip -q /tmp/lamassu-fonts/source-sans-pro.zip -d /tmp/lamassu-fonts
unzip -q /tmp/lamassu-fonts/source-code-pro.zip -d /tmp/lamassu-fonts
cp -rf /tmp/lamassu-fonts/source-sans-pro-*/TTF ui/css/fonts
cp -rf /tmp/lamassu-fonts/source-code-pro-*/TTF ui/css/fonts
echo "Setting up config files..."
cp device_config.sample.json device_config.json

if [ ! -e "licenses.json" ]; then
    echo
    echo "licenses.json not found. Edit the licenses.sample.json file, and add your API keys manually."
    echo 
fi

echo "Successful installation."

## Upgrade ubuntu
#do-release-upgrade

## Install nodejs & deps
#curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
#sudo apt-get -y install nodejs build-essential pkg-config libcairo2-dev libjpeg-devlibgif-dev

## Ugly hack for when having trouble compiling v4l2camera module
#echo "59a60\n> #include <time.h>" | sudo patch /usr/include/linux/videodev2.h


