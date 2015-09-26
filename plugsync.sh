#!/bin/bash

function up_help {
    echo "Sync and Manage cordova plugins on a macro level."
    echo ""
    echo "Usage: ./plugsync.sh [-h] [-u] [-l] [-c] [-d] [-s]"
    echo ""
    echo "Where:"
    echo "-h: Show Help"
    echo "-u: Update PLUGINS.txt from cordova plugins list"
    echo "-l: Load plugins from PLUGINS.txt"
    echo "-c: Clear/Remove all installed plugins"
    echo "-d: Run a sorted diff between PLUGINS.txt and installed plugins"
    echo "    Plugins in PLUGINS.txt not installed will show as (< plugin-name)."
    echo "    Plugins installed but not in PLUGINS.txt will show as (> plugin-name)."
    echo "-s: Optionally Sync plugins listed in PLUGINS.txt"
}

function plug_list {
    cordova plugin list | grep -oE "^(([a-z]+[-.])+[a-z]+)"
}

function sync {
    # Compare list and installed plugins. Install plugins.
    check=$(comm -3 ../PLUGINS.txt <(plug_list))
    if [[ $check ]]
    then
        read -p  "Plugins are present. Do you want to sync (Y/N)? " answer
        case ${answer:0:1} in
            y|Y)
            comm -23 ../PLUGINS.txt <(plug_list) | xargs cordova plugin add
            ;;
            *)
            exit
            ;;
        esac
    else
        echo "There are no plugins to sync."
    fi
}

cd mobileapp/

while [[ $# > 0 ]]
do
key="$1"

case $key in
    -h|--help)
    up_help
    exit
    ;;
    -u|--update)
    plug_list> ../PLUGINS.txt
    echo "Plugins copied to file."
    cat ../PLUGINS.txt
    exit
    ;;
    -l|--load)
    while read line
    do
        cordova plugin add $line
    done <../PLUGINS.txt
    echo "Plugins loaded from file."
    exit
    ;;
    -c|--clear)
    plug_list | xargs cordova plugin rm
    echo "Plugins Cleared."
    exit
    ;;
    -d|--diff)
    diff <(cat ../PLUGINS.txt | sort) <(plug_list | sort)
    exit
    ;;
    -s|--sync)
    sync
    exit
    ;;
    *)
    echo -e "Option $key is not valid. \n"
    up_help
    exit
    ;;
esac
done
