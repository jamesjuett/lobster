var Lobster = Lobster || {};

Lobster.Analysis = {};

// Checks if Matrix or Image interfaces were violated
var checkInterface = Lobster.checkInterface = function (program, codeEditor) {

    console.log("Checking interface...");


    // BFS of the children of code constructs
    var bfsChildren = function(queue, func) {
        var numBroken = 0;

        while (queue.length > 0) {
            var top = queue[0];
            queue.shift(); // pop front

            // do the thing
            var breaksInterface = func(top);
            if (breaksInterface) {
                numBroken += 1;
            }

            queue.pushAll(top.children);
        }
        console.log('Broke the interface ' + numBroken + ' times.');
        return numBroken;
    };

    // Returns a type or a pointer type of the module specified
    var getTypeAndPointerType = function(module) {

        // Type
        var type = program.globalScope.lookup(module).type;

        // Pointer Type
        var pointerType = Types.Pointer.instance(type);

        return [type, pointerType];
    };

    // Helper function for determining if the interface was broken in a particular module
    // This module could be Matrix or Image
    var checkInterface = function(construct, module) {

        // Grab a representation of the module as a type or a pointer to the type
        typeAndPointerType = getTypeAndPointerType(module);
        type = typeAndPointerType[0];
        pointerType = typeAndPointerType[1];

        if (similarType(construct.operand.type, type) ||
            similarType(construct.operand.type, pointerType)) {

            // If this operand is being used outside of a function starting with Matrix_, that's bad
            if (!construct.context.func.name.startsWith(module + "_")) {
                codeEditor.addAnnotation(GutterAnnotation.instance(construct, "breakInterface", "Breaking the interface " + construct.memberName));
                console.log(construct.memberName);
                return true;
            }
        }
        return false;
    };


    // Looking for breaking the interface
    // Need to clone topLevelDeclarations so we populate the queue each time this is called
    return bfsChildren(program.topLevelDeclarations.clone(), function(construct){

        if (isDotOrArrow(construct)) {

            // If it's not implicitly defined (i.e. not in original source code), don't annotate it
            if (!construct.context.implicit) {

                // Determine if broke Matrix or Image interface
                return checkInterface(construct, "Matrix") || checkInterface(construct, "Image");
            }
        }
        return false;
    });
};








// Checks if Matrix Init was called in all Image_init functions
var checkMatrixInit = Lobster.checkMatrixInit = function(program, codeEditor) {

    // Looking if forgetting to initialize Matrix channels in Image_init functions
    var bfsCalls = function(queue, func) {

        var foundMatrix_init = false;

        while (queue.length > 0) {
            var top = queue[0];
            queue.shift(); // pop front

            // do the thing
            foundMatrix_init = func(top);
            if (foundMatrix_init) {
                console.log("Good! You should initialize your channels because an Image is made up of Matrices.");
                return;
            }

            // get the definitions of the functions that are called
            queue.pushAll(top.calls.map(function(call) {
                return call.func.decl;
            }));
        }
        if (!foundMatrix_init) {
            console.log("Oops, looks like Matrix_init was never called in Image_init.")
        }
    };

    var imageInitEntities = program.globalScope.lookup("Image_init");
    var imageInitDefs = imageInitEntities.map(function(ent){
        return ent.decl;
    });


    // Call for both Image_init functions
    bfsCalls([imageInitDefs[0]], function(construct) {

        return construct.name == "Matrix_init";
    });

    bfsCalls([imageInitDefs[1]], function(construct) {

        return construct.name == "Matrix_init";
    });

};


// Function for detecting dots or arrow operators to detect breaking the interface
var isDotOrArrow = function(construct) {
    return isA(construct, Expressions.Dot) || isA(construct, Expressions.Arrow);
};
