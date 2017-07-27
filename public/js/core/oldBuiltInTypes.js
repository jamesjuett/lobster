Types.builtInTypes["list_t"] =
    Lobster.Types.List_t = Types.SimpleType.extend({
        _name: "List_t",
        i_type: "list_t",
        size: 4,

        valueToString : function(value){
            return JSON.stringify(value);
        },
        bytesToValue : function(bytes){
            //TODO: this is a hack for now.
            return Array.isArray(bytes[0]) ? bytes[0] : [];
        }
    });

//TODO haha I know of a much more efficient solution for this
var breadthFirstTree = function(tree){
    if (!tree || tree.elt === undefined){
        return ".";
    }
    var queue = [{tree: tree, row: 0, col: 0}];
    var lines = [];
    var minLeft = 0;
    var minRight = 0;
    while (queue.length > 0){
        var next = queue.pop();
        if (next.tree.elt === undefined){
            continue; // ignore empty trees
        }

        //is it a new line?
        if (lines.length <= next.row){
            lines.push({str:"", left:next.col});
            if (next.col < minLeft){
                minLeft = next.col;
            }
        }

        var line = lines[next.row];
        // add spaces to line until we get to next elt to be printed
        while (line.left + line.str.length < next.col){
            line.str += " ";
        }
        line.str += next.tree.elt; // print elt

        var left = next.tree.left;
        var right = next.tree.right;
        if (left){
            left = {tree: left, row: next.row+1, col: next.col-1};
            queue.unshift(left);
        }
        if (right){
            right = {tree: right, row: next.row+1, col: next.col+1};
            queue.unshift(right);
        }
    }

    //Adjust left sides. record max length to adjust right side
    var maxLength = 0;
    for(var i = 0; i < lines.length; ++i){
        var line = lines[i];
        for(var j = 0; j < line.left - minLeft; ++j){
            line.str = " " + line.str;
        }
        if (line.str.length > maxLength){
            maxLength = line.str.length;
        }
    }

    // Adjust right sides, which is just adjusting length since left is already done.
    for(var i = 0; i < lines.length; ++i){
        var line = lines[i];
        while (line.str.length < maxLength){
            line.str += " ";
        }
    }


    var str = "";
    for(var i = 0; i < lines.length; ++i){
        str += lines[i].str;
        str += "\n";
    }
    return str;
};

Types.builtInTypes["tree_t"] =
    Lobster.Types.Tree_t = Types.SimpleType.extend({
        _name: "Tree_t",
        i_type: "tree_t",
        size: 4,

        //depth: function(tree){
        //    var leftDepth = tree.left ? Types.Tree_t.depth(tree.left) : 0;
        //    var rightDepth = tree.right ? Types.Tree_t.depth(tree.right) : 0;
        //    var depth = tree.elt ? 1 : 0;
        //    depth += (leftDepth > rightDepth ? leftDepth : rightDepth);
        //    return depth;
        //},

        valueToString : function(value){
            //if (value.left){
            //    return "{" + this.valueToString(value.left) + " " + value.elt + " " + this.valueToString(value.right) + "}";
            //}
            //else{
            //    return "{}";
            //}
            return breadthFirstTree(value);
        },
        bytesToValue : function(bytes){
            return typeof bytes[0] === "object" ? bytes[0] : {};
        }
    });


//Lobster.Types.Card = Types.Class.extend({
//    _name: "Card",
//    className: "Card",
//    members: [
//        {name: "rank", type: Types.Rank.instance()},
//        {name: "suit", type: Types.Suit.instance()}
//    ]
//});
//
//Lobster.Types.Pack = Types.Class.extend({
//    _name: "Pack",
//    className: "Pack",
//    members: [
//        {name: "cards", type: Types.Array.instance(Types.Card.instance(),24)},
//        {name: "next", type: Types.Pointer.instance(Types.Card.instance())}
//    ]
//});
//
//Lobster.Types.Player = Types.Class.extend({
//    _name: "Player",
//    className: "Player",
//    members: [
//        {name: "name", type: Types.Array.instance(Types.Char.instance(),10)},
//        {name: "hand", type: Types.Array.instance(Types.Card.instance(),5)},
//        {name: "hand_size", type: Types.Int.instance()}
//    ]
//});
//
//
//
//Lobster.Types.Basket = Types.Class.extend({
//    _name: "Basket",
//    className: "Basket",
//    members: [
//        {name: "fruits", type: Types.Pointer.instance(Types.String.instance())},
//        {name: "num_fruits", type: Types.Int.instance()}
//    ]
//});
//
//
//Lobster.Types.Quote = Types.Class.extend({
//    _name: "Quote",
//    className: "Quote",
//    members: [
//        {name: "price", type: Types.Double.instance()},
//        {name: "time", type: Types.Int.instance()}
//    ]
//});
//Lobster.Types.Pricebook = Types.Class.extend({
//    _name: "Pricebook",
//    className: "Pricebook",
//    members: [
//        {name: "quotes", type: Types.Array.instance(Types.Quote.instance(), 5)},
//        {name: "size", type: Types.Int.instance()}
//    ]
//});