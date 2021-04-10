"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Program_1 = require("../core/Program");
Program_1.registerLibraryHeader("iostream", new Program_1.SourceFile("iostream.h", `
class ostream {};

ostream cout;

const char endl = '\\n';

class istream {

    // bool good() {
    //     return @istream::good;
    // }

    // bool bad() {
    //     return @istream::bad;
    // }

    // bool fail() {
    //     return @istream::fail;
    // }

    // bool eof() {
    //     return @istream::eof;
    // }

};

istream cin;
`, true));
// registerOpaqueExpression("istream::good", <OpaqueExpressionImpl<Bool, "prvalue">> {
//     type: Bool.BOOL,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
//         return getSize(rt.contextualReceiver);
//     }
// });
//# sourceMappingURL=iostream.js.map