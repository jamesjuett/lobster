"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Program_1 = require("../core/Program");
const opaqueExpression_1 = require("../core/opaqueExpression");
const types_1 = require("../core/types");
const runtimeEnvironment_1 = require("../core/runtimeEnvironment");
Program_1.registerLibraryHeader("cstdlib", new Program_1.SourceFile("cstdlib.h", `int rand() {
    return @rand;
}

void srand(int seed) {
    @srand;
}`, true));
opaqueExpression_1.registerOpaqueExpression("rand", {
    type: types_1.Int.INT,
    valueCategory: "prvalue",
    operate: (rt) => {
        return new runtimeEnvironment_1.Value(rt.sim.rng.randomInteger(0, 1000000), types_1.Int.INT);
    }
});
opaqueExpression_1.registerOpaqueExpression("srand", {
    type: types_1.VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt) => {
        rt.sim.rng.setRandomSeed(opaqueExpression_1.getLocal(rt, "seed").getValue().rawValue);
    }
});
//# sourceMappingURL=cstdlib.js.map