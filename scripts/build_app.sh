#!/bin/bash

NEUTRALINO_BUILD=true yarn generate
rm -rf app/resources/index.html app/resources/200.html app/resources/_nuxt/ app/dist/
cp -r dist/_nuxt/ dist/index.html dist/200.html app/resources/ || exit 1
cd app || exit 1
neu update || exit 1
neu build --release || exit 1
