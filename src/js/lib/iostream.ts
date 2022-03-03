
import { registerLibraryHeader, SourceFile } from "../core/Program";
import { registerOpaqueExpression, OpaqueExpressionImpl, RuntimeOpaqueExpression, getLocal } from "../core/opaqueExpression";
import { Int, CompleteClassType, Bool, VoidType } from "../core/types";
import { getDataPtr } from "./string";
import { Value } from "../core/runtimeEnvironment";
import { CPPObject } from "../core/objects";
import { RuntimeExpression } from "../core/constructs/expressions/Expression";
import { StandardInputStream } from "../core/streams";


registerLibraryHeader("iostream",
    new SourceFile("iostream.h",
`
class ostream {};

ostream cout;

const char endl = '\\n';

class istream {
private:
    bool _failbit;
    
    istream() {
        @istream::istream_default;
    }
    
public:
    bool good() {
        return @istream::good;
    }

    bool bad() {
        return @istream::bad;
    }

    bool fail() {
        return @istream::fail;
    }

    bool eof() {
        return @istream::eof;
    }

    int rdstate() {
        return @istream::rdstate;
    }

    void setstate(int state) {
        @istream::setstate;
    }

    void clear() {
        @istream::clear;
    }

    void clear(int state) {
        @istream::clear_int;
    }

};

istream cin;
`, true)
);

function getStream(rt: RuntimeExpression) {
    return <StandardInputStream>rt.contextualReceiver.getAuxiliaryData("stream");
}

registerOpaqueExpression("istream::istream_default", {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression) => {
        rt.contextualReceiver.setAuxiliaryData("stream", rt.sim.cin);
    }
});

registerOpaqueExpression("istream::good", <OpaqueExpressionImpl<Bool, "prvalue">>{
    type: Bool.BOOL,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        return new Value(getStream(rt).good() ? 1 : 0, Bool.BOOL);
    }
});

registerOpaqueExpression("istream::bad", <OpaqueExpressionImpl<Bool, "prvalue">>{
    type: Bool.BOOL,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        return new Value(getStream(rt).bad() ? 1 : 0, Bool.BOOL);
    }
});

registerOpaqueExpression("istream::fail", <OpaqueExpressionImpl<Bool, "prvalue">>{
    type: Bool.BOOL,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        return new Value(getStream(rt).fail() ? 1 : 0, Bool.BOOL);
    }
});

registerOpaqueExpression("istream::eof", <OpaqueExpressionImpl<Bool, "prvalue">>{
    type: Bool.BOOL,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
        return new Value(getStream(rt).eof() ? 1 : 0, Bool.BOOL);
    }
});



registerOpaqueExpression("istream::rdstate", <OpaqueExpressionImpl<Int, "prvalue">> {
    type: Int.INT,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<Int, "prvalue">) => {
        return new Value(getStream(rt).rdstate(), Int.INT);
    }
});

registerOpaqueExpression("istream::setstate", <OpaqueExpressionImpl<VoidType, "prvalue">> {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
        getStream(rt).setstate(getLocal<Int>(rt, "state").rawValue());
    }
});

registerOpaqueExpression("istream::clear", <OpaqueExpressionImpl<VoidType, "prvalue">> {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
        getStream(rt).clear();
    }
});

registerOpaqueExpression("istream::clear_int", <OpaqueExpressionImpl<VoidType, "prvalue">> {
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
        getStream(rt).clear(getLocal<Int>(rt, "state").rawValue());
    }
});


// registerOpaqueExpression("istream::good", <OpaqueExpressionImpl<Bool, "prvalue">> {
//     type: Bool.BOOL,
//     valueCategory: "prvalue",
//     operate: (rt: RuntimeOpaqueExpression<Bool, "prvalue">) => {
//         return getSize(rt.contextualReceiver);
//     }
// });