import { ArrayDefaultInitializer, AtomicDefaultInitializer, ClassDefaultInitializer } from "./DefaultInitializer";
import { ReferenceDirectInitializer, AtomicDirectInitializer, ArrayDirectInitializer, ClassDirectInitializer } from "./DirectInitializer";
import { ArrayAggregateInitializer } from "./ListInitializer";
import { AtomicValueInitializer, ReferenceValueInitializer, ArrayValueInitializer, ClassValueInitializer } from "./ValueInitializer";

export type AnalyticDefaultInitializer =
  | AtomicDefaultInitializer
  | AtomicDefaultInitializer
  | ArrayDefaultInitializer
  | ClassDefaultInitializer;

export type AnalyticDirectInitializer =
  | ReferenceDirectInitializer
  | AtomicDirectInitializer
  | ArrayDirectInitializer
  | ClassDirectInitializer;

export type AnalyticValueInitializer =
  | AtomicValueInitializer
  | ReferenceValueInitializer
  | ArrayValueInitializer
  | ClassValueInitializer;

export type AnalyticListInitializer =
  | ArrayAggregateInitializer;

export type AnalyticInitializer =
  | AnalyticDefaultInitializer
  | AnalyticDirectInitializer
  | AnalyticValueInitializer
  | AnalyticListInitializer;