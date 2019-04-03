#!/bin/sh

browserify js/main.js -o bundle.js
if [ $? -eq 0 ]; then
	python -c 'import BaseHTTPServer as bhs, SimpleHTTPServer as shs; bhs.HTTPServer(("0.0.0.0", '"$1"'), shs.SimpleHTTPRequestHandler).serve_forever()'
else
	echo "Failed to build bundle.js"
fi
