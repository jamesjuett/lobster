import { registerLibraryHeader, SourceFile } from '../core/Program';
import {
  registerOpaqueExpression,
  OpaqueExpressionImpl,
  RuntimeOpaqueExpression,
  getLocal,
} from '../core/opaqueExpression';
import { Int, CompleteClassType, Bool, VoidType } from '../core/types';
import { getDataPtr } from './string';
import { Value } from '../core/runtimeEnvironment';

registerLibraryHeader(
  'cstdlib',
  new SourceFile(
    'cstdlib.h',
    `int rand() {
    return @rand;
}

void srand(int seed) {
    @srand;
}`,
    true
  )
);

registerOpaqueExpression('rand', <OpaqueExpressionImpl<Int, 'prvalue'>>{
  type: Int.INT,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<Int, 'prvalue'>) => {
    return new Value(rt.sim.rng.randomInteger(0, 1000000), Int.INT);
  },
});

registerOpaqueExpression('srand', <OpaqueExpressionImpl<VoidType, 'prvalue'>>{
  type: VoidType.VOID,
  valueCategory: 'prvalue',
  operate: (rt: RuntimeOpaqueExpression<VoidType, 'prvalue'>) => {
    rt.sim.rng.setRandomSeed(getLocal<Int>(rt, 'seed').getValue().rawValue);
  },
});
