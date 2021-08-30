
import { registerLibraryHeader } from "../core/Program";
import { registerOpaqueExpression, OpaqueExpressionImpl, RuntimeOpaqueExpression, getLocal } from "../core/opaqueExpression";
import { Int, CompleteClassType, Bool, VoidType } from "../core/types";
import { getDataPtr } from "./string";
import { Value } from "../core/runtimeEnvironment";
import { SourceFile } from "../core/preprocessor";


registerLibraryHeader("iostream",
    new SourceFile("iostream.h",
`
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
`, true)
);




// registerOpaqueExpression("istream::good", <OpaqueExpressionImpl<Bool, "prvalue">> {
//     type: Bool.BOOL,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
//         return getSize(rt.contextualReceiver);
//     }
// });