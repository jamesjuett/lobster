# lobster
Interactive Program Visualization Tools


This readme is underdeveloped. It should eventually describe:
 - how to set up a local development environment
 - how to develop and compile the frontend
 - how to deploy

# Miscellaneous

Command to generate parser module:
```console
./node_modules/pegjs/bin/pegjs --plugin ./node_modules/ts-pegjs/src/tspegjs --allowed-start-rules start,declaration -o src/js/parse/cpp_parser.ts other/grammar.txt
```