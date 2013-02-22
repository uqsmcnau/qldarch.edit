#!/bin/bash

git pull origin master
cp -R src/[^.]* /var/www/html/explore/
