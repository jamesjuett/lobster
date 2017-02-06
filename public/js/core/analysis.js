var Lobster = Lobster || {};

Lobster.Analysis = {};

var Bird = Lobster.Analysis.Bird = Class.extend({
    _name: "Bird",

    init : function(name, age) {
        // Create and initialize instance variable
        this.i_name = name;
        this.i_age = age;
        //this.egg = // create an egg object.
    },

    getName : function() {
        return this.i_name;
    }

});


var Chicken = Lobster.Analysis.Chicken = Bird.extend({
    _name: "Chicken"

    // inherit bird constructor implicitly
});

var Duck = Lobster.Analysis.Duck = Bird.extend({
    _name: "Duck",

    // new ctor for Duck. Takes in name, age is optional (default 0)
    // also initializes new member variable for Duck beyond Bird stuff
    init : function(name, age) {
        age = age || 0;
        this.initParent(name, age || 0);
        this.i_numDucklings = 0;
    },

    setAge : function(newAge) {
        this.name = newAge;
        delete this.name;
    },

    // example overriding
    getName : function() {
        // all ducks are named daffy
        return "daffy";
    }

    // x || y
    // x ? x : y
    //
    // x && y
    // x ? y : false
});

var analyze = Lobster.analyze = function(program, codeEditor) {

    var queue = program.topLevelDeclarations;
    var numFors = 0;
    while(queue.length > 0) {
        var top = queue[0];
        queue.shift();
        if (isA(top, Statements.For)) {
            ++numFors;
            codeEditor.addAnnotation(SimpleAnnotation.instance(top));
        }
        queue.pushAll(top.children);
    }
    console.log("There were " + numFors + " for loops.");
  // var myBird = Bird.instance("Myrtle II", 3);
  // console.log(myBird.getName());
  //
  // var myDuck = Duck.instance("scrooge");

  // NEVER DO THIS from outside "private" scope
//    obj.member = blah

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