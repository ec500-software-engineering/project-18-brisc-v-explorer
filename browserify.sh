#!/bin/bash

browserify js/main.js -o bundle.js
if [ $? -eq 0 ]; then
	echo "bundle.js created!"
else
	echo "Failed to build bundle.js"
fi
