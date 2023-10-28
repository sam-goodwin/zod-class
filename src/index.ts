import tf, { PascalCase } from "type-fest";

import {
  ParseParams,
  SafeParseReturnType,
  ZodArray,
  ZodFunction,
  ZodLazy,
  ZodMap,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodPromise,
  ZodRawShape,
  ZodRecord,
  ZodSet,
  ZodTuple,
  ZodType,
  object,
  z,
} from "zod";
import { toPascalCase } from "./to-pascal-case.js";

const IS_ZOD_CLASS = Symbol.for("zod-class");

type Ctor<T = any> = {
  new (input: any): T;
};

export interface ZodClass<Members, Instance, Shape extends ZodRawShape>
  extends ZodType<Instance> {
  shape: Shape;
  extend<Super extends Ctor, ChildShape extends ZodRawShape>(
    this: Super,
    shape: ChildShape
  ): StaticProperties<ChildShape> & {
    [k in keyof Super]: Super[k];
  } & ZodClass<
      Z.infer<ZodObject<ChildShape>> & ConstructorParameters<Super>[0],
      Z.infer<ZodObject<ChildShape>> & InstanceType<Super>,
      Omit<Shape, keyof ChildShape> & ChildShape
    >;
  parse<T>(this: Ctor<T>, value: unknown): T;
  parseAsync<T>(this: Ctor<T>, value: unknown): Promise<T>;
  safeParse<T, V>(this: Ctor<T>, value: V): SafeParseReturnType<V, T>;
  safeParseAsync<T, V>(
    this: Ctor<T>,
    value: V
  ): Promise<SafeParseReturnType<V, T>>;
  optional<Self extends ZodType>(this: Self): ZodOptional<Self>;
  nullable<Self extends ZodType>(this: Self): ZodNullable<Self>;

  new (data: Members): Instance;
}

type OptionalKeys<Shape> = {
  [k in keyof Shape]: undefined extends Z.infer<Shape[k]> ? k : never;
}[keyof Shape];

export declare namespace Z {
  export type infer<T> = T extends new (...args: any[]) => infer R
    ? R
    : T extends ZodObject<infer Shape>
    ? {
        [k in keyof Pick<
          Shape,
          Exclude<keyof Shape, OptionalKeys<Shape>>
        >]: Z.infer<Shape[k]>;
      } & {
        [k in OptionalKeys<Shape>]+?: Z.infer<Shape[k]>;
      }
    : T extends ZodArray<infer I>
    ? Z.infer<I>[]
    : T extends ZodOptional<infer T>
    ? Z.infer<T> | undefined
    : T extends ZodNullable<infer T>
    ? Z.infer<T> | null
    : T extends ZodTuple<infer T>
    ? { [i in keyof T]: Z.infer<T[i]> }
    : T extends ZodRecord<infer Key, infer Value>
    ? {
        [k in Z.infer<Key>]: Z.infer<Value>;
      }
    : T extends ZodMap<infer Key, infer Value>
    ? Map<Z.infer<Key>, Z.infer<Value>>
    : T extends ZodSet<infer Item>
    ? Set<Z.infer<Item>>
    : T extends ZodFunction<infer Args, infer Output>
    ? (...args: Z.infer<Args>) => Z.infer<Output>
    : T extends ZodLazy<infer T>
    ? Z.infer<T>
    : T extends ZodPromise<infer T>
    ? Promise<Z.infer<T>>
    : T extends ZodType<any, any, any>
    ? z.infer<T>
    : never;
}

type StaticProperties<Shape extends ZodRawShape> = {
  [property in keyof Shape as PascalCase<property>]: Shape[property];
};

export interface Z {
  class<Shape extends ZodRawShape>(
    shape: Shape
  ): StaticProperties<Shape> &
    ZodClass<Z.infer<ZodObject<Shape>>, Z.infer<ZodObject<Shape>>, Shape>;
}

export const Z = {
  class<T extends ZodRawShape>(
    shape: T
  ): {
    [property in keyof T as PascalCase<property>]: T[property];
  } & ZodClass<
    {
      [k in keyof T]: Z.infer<T[k]>;
    },
    Z.infer<ZodObject<T>>,
    T
  > {
    const _schema = object(shape);
    const clazz = class {
      static [IS_ZOD_CLASS]: true = true;
      static schema = _schema;
      static shape = shape;

      constructor(value: ZodValue<ZodObject<T>>) {
        Object.assign(this, _schema.parse(value));
      }

      static extend<Shape extends ZodRawShape>(augmentation: Shape) {
        const augmented = this.schema.extend(augmentation);
        // @ts-ignore
        const clazz = class extends this {
          static schema = augmented;
          constructor(value: any) {
            super(value);
            Object.assign(this, augmented.parse(value));
          }
        } as any;
        Object.assign(clazz, getStaticMembers(augmentation));
        return clazz;
      }

      static _parse = this.schema._parse.bind(this.schema);
      static _parseSync = this.schema._parseSync.bind(this.schema);

      static optional() {
        return new ZodOptional(this as any);
      }
      static nullable() {
        return new ZodNullable(this as any);
      }

      static parse(value: unknown, params?: Partial<ParseParams>) {
        return new this(this.schema.parse(value, params) as any);
      }

      static parseAsync(value: unknown, params?: Partial<ParseParams>) {
        return this.schema
          .parseAsync(value, params)
          .then((value) => new this(value as any));
      }

      static safeParse(
        value: unknown,
        params?: Partial<ParseParams>
      ): SafeParseReturnType<any, any> {
        return coerceSafeParse(
          this as any,
          this.schema.safeParse(value, params)
        );
      }

      static safeParseAsync(
        value: unknown,
        params?: Partial<ParseParams>
      ): Promise<SafeParseReturnType<any, any>> {
        return this.schema
          .safeParseAsync(value, params)
          .then((result) => coerceSafeParse(this as any, result));
      }
    };
    Object.assign(clazz, getStaticMembers(shape));
    return clazz as any;
  },
};

function getStaticMembers(shape: ZodRawShape) {
  return Object.fromEntries(
    Object.entries(shape).map(([key, value]) => [toPascalCase(key), value])
  );
}

function coerceSafeParse<C extends ZodClass<any, any, any>>(
  clazz: C,
  result: SafeParseReturnType<any, any>
): SafeParseReturnType<any, InstanceType<C>> {
  if (result.success) {
    return {
      success: true,
      data: new clazz(result.data) as InstanceType<C>,
    };
  } else {
    return result;
  }
}

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type ZodValue<T extends ZodType> = T extends ZodType<infer Output>
  ? UnionToIntersection<Output>
  : never;
