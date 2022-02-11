
import { Program, SimpleProgram, SourceFile } from './src/js/core/Program';
import { readFileSync, writeFileSync } from 'fs';
import { encode } from 'he';
import { Simulation } from './src/js/core/Simulation';
import { SynchronousSimulationRunner } from './src/js/core/simulationRunners';

import "./src/js/lib/standard";

let submissions : string[] = JSON.parse(readFileSync("recursion.json", "utf-8"));

// function applyHarness(sub: string) {
//     return  `
// using namespace std;

// struct Node
// {
//   Node *next;
//   Node *prev;
//   int datum;
// };
// class List
// {
//   //OVERVIEW: a doubly-linked, double-ended list with Iterator interface
// public:
//   List(int arr[], int n)
//       : first(0), last(0)
//   {
//     for (int i = n - 1; i >= 0; --i)
//     {
//       push_front(arr[i]);
//     }
//   }

// public:
//   //EFFECTS:  inserts datum into the back of the list
//   void push_front(int datum)
//   {
//     Node *np = new Node;
//     delete new Node; // so that nodes don't end up contiguous in memory

//     if (!first)
//     {
//       np->next = 0;
//       last = np;
//     }
//     else
//     {
//       np->next = first;
//       first->prev = np;
//     }
//     np->prev = 0;
//     np->datum = datum;
//     first = np;
//   }

//   int sum()
//   {
//     ${sub}
//   }

// private:
//   //a private type

//   Node *first; // points to first Node in list, or nullptr if list is empty
//   Node *last;  // points to last Node in list, or nullptr if list is empty

// public:
//   ////////////////////////////////////////

//   ~List()
//   {
//     for (Node *n = first; n;)
//     {
//       Node *v = n;
//       n = n->next;
//       delete v;
//     }
//   }

// }; //List

// ////////////////////////////////////////////////////////////////////////////////
// // Add your member function implementations below or in the class above
// // (your choice). Do not change the public interface of List, although you
// // may add the Big Three if needed.  Do add the public member functions for
// // Iterator.

// int main()
// {
//   int arr[4] = {1, 2, 3, 4};
//   List list(arr, 4);
//   assert(list.sum() == 10);
// }
// `;
// }


// function applyHarness(sub: string) {
//     return  `
//     int MAX_APPS = 5;
//     struct Application {
//         int memoryUsed;
//         int name;
//     };
//     class Smartphone {
//     private:
//       int numApps;
//       int MAX_APPS;
//       Application *apps[5];
//     public:
//       Smartphone &operator=(const Smartphone &rhs){
//         ${sub}
//       }
//     };
// `;
// }

function applyHarness(sub: string) {
    return  `
    struct Node {
        int datum;
        Node *left;
        Node *right;
        
        Node(int datum, Node *left, Node *right)
          : datum(datum), left(left), right(right) { }
      };
      
      int countEqual(const Node *root, int compare) {
        ${sub}
      }
      
      int main() {
        Node *null = 0;
        Node *lll = new Node(4,null,null);
        Node *llr = new Node(5,null,null);
        Node *ll = new Node(2,lll,llr);
        Node *lrl = new Node(4,null,null);
        Node *lr = new Node(1,lrl,null);
        Node *l = new Node(3,ll,lr);
        Node *rrl = new Node(4,null,null);
        Node *rr = new Node(4,rrl,null);
        Node *r = new Node(1,null,rr);
        Node *root = new Node(4,l,r);
        assert(countEqual(root, 4) == 5);
      }
`;
}

// let header = `




// `;

function getFunc(program: Program, name: string) {
    return program.linkedFunctionDefinitions[name]?.definitions[0];
}

let equivalenceGroups : {
    submission: string,
    program: Program,
    testCasesPassed?: boolean
    runtimeEvent?: boolean
}[][] = [];

submissions.forEach((sub, i) => {
    console.log(i);
    
    let p = new SimpleProgram(applyHarness(sub));

    // Try compiling with an extra \n} added at the very end
    if (!getFunc(p, "countEqual")) {
        p = new SimpleProgram(applyHarness(sub + "\n}"));
    }

    // Try compiling with an extra ; added after lines ending in a character or digit
    if (!getFunc(p, "countEqual")) {
        p = new SimpleProgram(applyHarness(sub.replace(/(?<=[a-zA-Z0-9])\n/, ";\n")));
    }

    if (!getFunc(p, "countEqual")) {
        // Didn't parse or can't find function, make a new group
        equivalenceGroups.push([{submission: sub, program: p}]);
        return;
    }

    let equivGroup = equivalenceGroups.find(group => {
        let rep = group[0].program;
        let repFunc = getFunc(rep, "countEqual");
        return repFunc && getFunc(p, "countEqual")!.isSemanticallyEquivalent(repFunc, {});
    });
    
    let sim: Simulation | undefined;
    if (p.isRunnable()) {
        console.log("runnable");
        sim = new Simulation(p);
        new SynchronousSimulationRunner(sim).stepToEnd(2000)
    }
    else {
        console.log(p.notes.allNotes.map(n => n.message));
    }

    let result = {
        submission: sub,
        program: p,
        testCasesPassed: sim && !sim.hasAnyEventOccurred,
        runtimeEvent: sim?.hasAnyEventOccurred
    }

    if (equivGroup) {
        equivGroup.push(result);
    }
    else {
        equivalenceGroups.push([result]);
    }
});

equivalenceGroups.sort((a,b) => b.length - a.length);

let out = {
    num_total: submissions.length,
    num_groups: equivalenceGroups.length,
    num_to_grade: equivalenceGroups.filter(eg => !eg[0].testCasesPassed).length,
    num_parsed: equivalenceGroups.filter(g => getFunc(g[0].program, "countEqual")).length,
    num_failed: equivalenceGroups.filter(g => !getFunc(g[0].program, "countEqual")).length,
    num_single: equivalenceGroups.filter(g => g.length === 1).length,
    num_test_cases_passed: equivalenceGroups.filter(g=>g[0].testCasesPassed).length,
    num_runtime_event: equivalenceGroups.filter(g=>g[0].runtimeEvent).length,
    group_lengths: equivalenceGroups.map(eg => eg.length),
    groups: equivalenceGroups.map((eg,i) => ({
        group: i,
        parsed: !!getFunc(eg[0].program, "countEqual"),
        num: eg.length,
        testCasesPassed: eg[0].testCasesPassed,
        runtimeEvent: eg[0].runtimeEvent,
        submissions: eg.map(g => g.submission)
    }))
}

writeFileSync("equivalent_matches.json", JSON.stringify(out, null, 2), "utf8");

let html = `<html><head>

<!-- bootstrap icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.3.0/font/bootstrap-icons.css">

<style>
table {
    margin: 1em;
    border: solid 1px black;
}
</style>
</head><body>

${out.groups.map(g => `<table><tr>${g.testCasesPassed ? `<td style="vertical-align: middle; font-size: 48pt; color: green;"><i class="bi bi-check-circle"></i></td>` : ""} ${g.submissions.map(sub => `<td><pre><code>${encode(sub)}</code></pre>${g.testCasesPassed ? `<div style="text-align: center;">CORRECT</div>` : ""}</td>`).join("")}</tr></table>`).join("")}

</body></html>`;

writeFileSync("equiv.html", html, "utf8");
