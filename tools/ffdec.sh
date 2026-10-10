#!/bin/sh
# Run JPEXS CLI with the project-local JRE.
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/jre/Contents/Home/bin/java" -Djava.awt.headless=true -Xmx4g -jar "$DIR/ffdec/ffdec-cli.jar" "$@"
