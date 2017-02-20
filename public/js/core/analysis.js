var Lobster = Lobster || {};

Lobster.Analysis = {};

// var Bird = Lobster.Analysis.Bird = Class.extend({
//     _name: "Bird",
//
//     init : function(name, age) {
//         // Create and initialize instance variable
//         this.i_name = name;
//         this.i_age = age;
//         //this.egg = // create an egg object.
//     },
//
//     getName : function() {
//         return this.i_name;
//     }
//
// });
//
//
// var Chicken = Lobster.Analysis.Chicken = Bird.extend({
//     _name: "Chicken"
//
//     // inherit bird constructor implicitly
// });
//
// var Duck = Lobster.Analysis.Duck = Bird.extend({
//     _name: "Duck",
//
//     // new ctor for Duck. Takes in name, age is optional (default 0)
//     // also initializes new member variable for Duck beyond Bird stuff
//     init : function(name, age) {
//         age = age || 0;
//         this.initParent(name, age || 0);
//         this.i_numDucklings = 0;
//     },
//
//     setAge : function(newAge) {
//         this.name = newAge;
//         delete this.name;
//     },
//
//     // example overriding
//     getName : function() {
//         // all ducks are named daffy
//         return "daffy";
//     }
//
//     // x || y
//     // x ? x : y
//     //
//     // x && y
//     // x ? y : false
// });

// check for IntegralConversion coming from LValueToRValue coming from an Assignment
// if (isA(top.if, Conversions.IntegralConversion)){
//     if(isA(top.if.from, Conversions.LValueToRValue)) {
//         if (isA(top.if.from.from, Expressions.Assignment)){
//             codeEditor.addAnnotation(GutterAnnotation.instance(top.if.from.from, "", "Careful! Did you really want to do assignment here??"));
//         }
//     }
// }



var analyze = Lobster.analyze = function(program, codeEditor) {

    // Type Matrix
    var matrixType = program.globalScope.lookup("Matrix").type;

    // Pointer to type Matrix
    var matrixPointerType = Types.Pointer.instance(matrixType);

    // Type Image
    var imageType = program.globalScope.lookup("Image").type;

    // Pointer to type Image
    var imagePointerType = Types.Pointer.instance(imageType);

    // BFS of the children of code constructs
    var bfsChildren = function(queue, func) {

        while (queue.length > 0) {
            var top = queue[0];
            queue.shift(); // pop front

            // do the thing
            func(top);

            queue.pushAll(top.children);
        }
    };


    bfsChildren(program.topLevelDeclarations, function(construct){
        if (isDotOrArrow(construct)) {

            // If it's not implicitly defined (i.e. not in original source code), don't annotate it
            if (!construct.context.implicit) {

                // TODO MAKE A FUNCTION

                // Check if breaking Matrix interface with a Matrix or Matrix*
                if (similarType(construct.operand.type, matrixType) ||
                    similarType(construct.operand.type, matrixPointerType)) {

                    // If this operand is being used outside of a function starting with Matrix_, that's bad
                    if (!construct.context.func.name.startsWith("Matrix_")) {
                        codeEditor.addAnnotation(GutterAnnotation.instance(construct, "breakInterface", "Breaking the interface!"));
                    }
                }

                // Check if breaking Image interface with Image or Image*
                if (similarType(construct.operand.type, imageType) ||
                    similarType(construct.operand.type, imagePointerType)) {

                    // If this operand is being used outside of a function starting with Matrix_, that's bad
                    if (!construct.context.func.name.startsWith("Image_")) {
                        codeEditor.addAnnotation(GutterAnnotation.instance(construct, "breakInterface", "Breaking the interface!"));
                    }
                }
            }
        }
    });

};


// Function for detecting dots or arrow operators to detect breaking the interface
var isDotOrArrow = function(construct) {
    return isA(construct, Expressions.Dot) || isA(construct, Expressions.Arrow);
};

// var other = {
//     blah: 3
// };
//
// var prices = {
//     apple: 1.3,
//     house: 10000000,
//     horse: {name: "mr ed"}
// };
// // prices["horse"];
// // prices.horse;