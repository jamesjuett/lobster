
import { Program, SourceFile } from './src/js/core/Program';
import { readFileSync, writeFileSync } from 'fs';

let submissions : string[] = JSON.parse(readFileSync("submissions.json", "utf-8"));

let header = `
struct Node {
    Node * next;
};

Node *first;
Node *last;

`

let p1 = new Program([
    new SourceFile("test.cpp", header + submissions[0])
], new Set<string>(["test.cpp"]));

console.log(p1.notes.allNotes.map(n => n.id));

let matches : string[] = [];

if (p1.mainFunction) {
    submissions.forEach((sub, i) => {
        // console.log("checking: " + sub);
    
        let p2 = new Program([
            new SourceFile("test.cpp", header + sub)
        ], new Set<string>(["test.cpp"]));
    
        if (p2.mainFunction) {
            if (p1.mainFunction!.isSemanticallyEquivalent(p2.mainFunction, {})) {
                console.log(`${i}: equivalent`);
                matches.push(sub);
            }
            else {
                console.log(`${i}: nope`);
            }
        }
        else {
            console.log(`${i}: didn't parse`);
        }
    });
}

writeFileSync("equivalent_matches.json", JSON.stringify(matches, null, 2), "utf8");
