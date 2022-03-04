
import { registerLibraryHeader, SourceFile } from "../core/compilation/Program";
import { registerOpaqueExpression, OpaqueExpressionImpl, RuntimeOpaqueExpression } from "../core/constructs/expressions/OpaqueExpression";
import { Int, CompleteClassType, Bool, VoidType } from "../core/compilation/types";
import { getDataPtr } from "./string";
import { Value } from "../core/runtime/Value";
import { getLocal } from "../core/compilation/contexts";


registerLibraryHeader("cstdlib",
    new SourceFile("cstdlib.h",
`int rand() {
    return @rand;
}

void srand(int seed) {
    @srand;
}`, true
    )
);


registerOpaqueExpression("rand", <OpaqueExpressionImpl<Int, "prvalue">>{
    type: Int.INT,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<Int, "prvalue">) => {

        return new Value(rt.sim.rng.randomInteger(0, 1000000), Int.INT);
        
    }
});


registerOpaqueExpression("srand", <OpaqueExpressionImpl<VoidType, "prvalue">>{
    type: VoidType.VOID,
    valueCategory: "prvalue",
    operate: (rt: RuntimeOpaqueExpression<VoidType, "prvalue">) => {
        rt.sim.rng.setRandomSeed(getLocal<Int>(rt, "seed").getValue().rawValue);
    }
});
