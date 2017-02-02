/**
 * Created by james on 1/23/2015.
 */


var filename = process.argv[2];

var fs = require("fs");
var path = require("path");


//eval(fs.readFileSync("underscore-min.js")+"");
eval(fs.readFileSync("util.js")+"");
eval(fs.readFileSync("entities.js")+"");
eval(fs.readFileSync("outlet.js")+"");
eval(fs.readFileSync("internals.js")+"");
eval(fs.readFileSync("error.js")+"");
eval(fs.readFileSync("types.js")+"");
eval(fs.readFileSync("expressions.js")+"");
eval(fs.readFileSync("declarations.js")+"");
eval(fs.readFileSync("statements.js")+"");
eval(fs.readFileSync("Simulation.js")+"");
eval(fs.readFileSync("parsing.js")+"");


var tailCheck = function(filename){

    try{
        var sourceCode = fs.readFileSync(filename).toString();
    }
    catch(e){
        if (e.line){
            return {
                filename:filename,
                fileExists: false,
                parsed: false,
                parseErrorLine: e.line
            }
        }
        else{
            return {
                filename:filename,
                fileExists: false,
                parsed: false
            }
        }
    }

    var sim = Simulation.instance();


    var results = {
        filename: filename,
        fileExists: true,
        parsed: true
    };

    var actor = Actor.instance({
        otherError : function(msg){
            //console.log(msg.data);
        },
        unknownError : function(msg){
            //console.log(msg.data);
        },
        syntaxError : function(msg){
            //console.log(msg.data);
            results.parsed = false;
            results.syntaxError = msg.data;
        },
        semanticError : function(msg){
            //console.log(msg.data);
        }
    });

    sim.addListener(actor);

    sim.setSourceCode(sourceCode);

    //var funcsToCheck = [
    //    {name:"sum", paramTypes:[Types.List_t.instance()]},
    //    {name:"product", paramTypes:[Types.List_t.instance()]},
    //    {name:"accumulate", paramTypes:[Types.List_t.instance(), ]},
    //];

    if (!results.parsed){
        return results;
    }

    var funcsToCheck = [
        "int sum(list_t list);",
        "int product(list_t list);",
        "int accumulate(list_t list, int (*)(int, int), int identity);",
        "list_t reverse(list_t list);",
        "list_t append(list_t first, list_t second);",
        "list_t filter_odd(list_t list);",
        "list_t filter_even(list_t list);",
        "list_t filter(list_t list, bool (*fn)(int));",
        "list_t rotate(list_t list, int n);",
        "list_t insert_list(list_t first, list_t second, int n);",
        "list_t chop(list_t list, int n);",
        "int fib_tail(int n);",
        "int fib(int n);",
        "int tree_sum(tree_t tree);",
        "list_t traversal(tree_t tree);",
        "bool contained_by(tree_t A, tree_t B);",
        "tree_t insert_tree(int elt, tree_t tree);"
    ];


    for(var i = 0; i < funcsToCheck.length; ++i){
        var toCheck = funcsToCheck[i];
        toCheck = UMichEBooks.cPlusPlusParser.parse(toCheck, {startRule:"declaration"});
        toCheck = Declarations.create(toCheck, {parent: null});
        toCheck.compile(NamespaceScope.instance("", null, this));
        toCheck = toCheck.entities[0];

        //var decl = Declaration.instance(UMichEBooks.cPlusPlusParser.parse());
        //decl.compile();
        var name = toCheck.name;
        var paramTypes = toCheck.type.paramTypes;
        var func = sim.i_globalScope.lookup(name, {paramTypes: paramTypes, exactMatch:true});

        //console.log(name + ", " + func);

        var constructResults = function(func){
            func = func && func.decl
            var result;
            //if (!func.decl){
            //    console.log(func.name);
            //}
            if (isA(func, FunctionDefinition)){
                result = {
                    //name: func && func.name,
                    found: true,
                    recursive: func.isRecursive,
                    tailRecursive: func.constantStackSpace
                };

                if (result.recursive && !result.tailRecursive){
                    result.reason = func.nonTailCycleReason;
                    result.nonTailCalls = func.nonTailCycleCalls.map(function(elem){
                        if (elem.isTailOthers && elem.isTailOthers[0]){
                            var code = elem.isTailOthers[0].code;
                            return "Line " + code.line + ": " + code.text + (elem.isTailReason ? ".  " + elem.isTailReason : "");
                        }
                        else{
                            var code = elem.code;
                            return "Line " + code.line + ": " + code.text + (elem.isTailReason ? ".  " + elem.isTailReason : "");
                        }
                    });
                }

                //if (result.tailRecursiveStatus == "no"){
                //    result.details = func.nonTailCalls.map(function(elem){
                //        return elem.code.text +"(" + elem.isTailReason + ")";
                //    });
                //}
                //
                //if (result.tailRecursiveStatus == "callToNonTail"){
                //    //result.details = func.callsToNonTail.map(function(elem){
                //    //    return constructResults(elem.staticFunction);
                //    //});
                //}
            }
            else{
                result = {
                    //name:func && func.name,
                    found: false
                };
            }
            return result;
        };
        results[name] = constructResults(func);
    }

    return results;

    //sim.annotate();

};

var results = tailCheck(filename);
console.log(JSON.stringify(results, null, 2));


//var files = fs.readdirSync("./f14");
////console.log(files);
//
//files = files.map(function(filename){
//    return "f14/" + filename + "/p2.cpp";
//});
//
//files.forEach(function(filename){
//    try {
//
//        var results = tailCheck(filename);
//        if (results.fileExists && !results.parsed) {
//            console.log(results);
//        }
//        else {
//            console.log(results.filename);
//        }
//    }
//    catch(e){
//        console.log(filename + " crashed :(");
//    }
//});