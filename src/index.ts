import type { PascalCase } from "type-fest";

import {
  ParseInput,
  ParseParams,
  ParseReturnType,
  SafeParseReturnType,
  SyncParseReturnType,
  ZodArray,
  ZodFunction,
  ZodIntersection,
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
  ZodTypeAny,
  ZodUnion,
  object,
  z,
} from "zod";

import { toPascalCase } from "./to-pascal-case.js";

const IS_ZOD_CLASS = Symbol.for("zod-class");

type Ctor<T = any> = {
  [key: string]: any;
  new (input: any): T;
};

export interface ZodClass<
  Members = any,
  Instance = any,
  Shape extends ZodRawShape = ZodRawShape
> extends ZodType<Instance> {
  shape: Shape;
  staticProps: StaticProperties<Shape>;

  pick<Mask extends keyof Shape>(...mask: Mask[]): Z.Class<Pick<Shape, Mask>>;
  pick<
    Mask extends {
      [property in keyof Shape]?: true | undefined;
    }
  >(
    mask: Mask
  ): Z.Class<
    Pick<
      Shape,
      {
        [property in keyof Mask]: Mask[property] extends true
          ? Extract<property, keyof Shape>
          : never;
      }[keyof Mask]
    >
  >;

  omit<Mask extends keyof Shape>(...mask: Mask[]): Z.Class<Omit<Shape, Mask>>;
  omit<
    Mask extends {
      [property in keyof Shape]?: true | undefined;
    }
  >(
    mask: Mask
  ): Z.Class<
    Omit<
      Shape,
      {
        [property in keyof Mask]: Mask[property] extends true
          ? Extract<property, keyof Shape>
          : never;
      }[keyof Mask]
    >
  >;
  schema<T>(this: Ctor<T>): z.ZodType<T>;
  extend<Super extends Ctor, ChildShape extends ZodRawShape>(
    this: Super,
    shape: ChildShape
  ): StaticProperties<ChildShape> & {
    [k in Exclude<keyof Super, keyof z.ZodObject<any>>]: Super[k];
  } & ZodClass<
      Z.infer<ZodObject<ChildShape>> & ConstructorParameters<Super>[0],
      Z.infer<ZodObject<ChildShape>> & InstanceType<Super>,
      Omit<Shape, keyof ChildShape> & ChildShape
    >;

  optional<Self extends ZodTypeAny>(this: Self): ZodOptional<Self>;
  nullable<Self extends ZodTypeAny>(this: Self): ZodNullable<Self>;

  array<Self extends ZodType>(this: Self): ZodArray<Self>;
  promise<Self extends ZodType>(this: Self): ZodPromise<Self>;
  or<Self extends ZodType, Other extends ZodType>(
    this: Self,
    other: Other
  ): ZodUnion<[Self, Other]>;
  and<Self extends ZodType, Other extends ZodType>(
    this: Self,
    other: Other
  ): ZodIntersection<Self, Other>;

  parse<T>(this: Ctor<T>, value: unknown): T;
  parseAsync<T>(this: Ctor<T>, value: unknown): Promise<T>;
  safeParse<T>(
    this: Ctor<T>,
    data: unknown,
    params?: Partial<ParseParams>
  ): SafeParseReturnType<Instance, T>;
  safeParseAsync<T, V>(
    this: Ctor<T>,
    data: unknown,
    params?: Partial<ParseParams>
  ): Promise<SafeParseReturnType<Instance, T>>;

  new (data: Members): Instance;
  new (data: z.input<ZodObject<Shape>>): Instance;
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
        [k in Extract<Z.infer<Key>, string | number | symbol>]: Z.infer<Value>;
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

export declare namespace Z {
  export type Class<Shape extends ZodRawShape> = StaticProperties<Shape> &
    ZodClass<Z.infer<ZodObject<Shape>>, Z.infer<ZodObject<Shape>>, Shape>;
}

export const Z = {
  class<T extends ZodRawShape>(shape: T): Z.Class<T> {
    const clazz = class {
      static [IS_ZOD_CLASS]: true = true;
      static schema() {
        return this;
      }
      static innerType = this;
      static shape = shape;
      static _schema = object(shape);

      constructor(value: ZodValue<ZodObject<T>>) {
        const parsed = clazz._schema.parse(value);
        return _newInstance(this.constructor, parsed);
      }

      static merge = this.extend.bind(this);

      static extend<Shape extends ZodRawShape>(augmentation: Shape) {
        const augmented = this._schema.extend(augmentation);
        // @ts-ignore
        const clazz = class extends this {
          static shape = augmented.shape;
          static _schema = augmented;

          constructor(value: any) {
            super(value);
            Object.assign(this, augmented.parse(value));
          }
        } as any;
        Object.assign(clazz, getStaticMembers(augmentation));
        return clazz;
      }

      // can NOT create a sub-type
      static pick(
        mask:
          | string
          | {
              [key in keyof typeof this._schema]: true | undefined;
            },
        ...masks: string[]
      ) {
        if (typeof mask === "string") {
          return Z.class(
            this._schema.pick({
              [mask]: true,
              ...Object.fromEntries(masks.map((m) => [m, true])),
            } as {
              [key in keyof typeof this._schema]: true | undefined;
            }).shape
          );
        } else {
          return Z.class(this._schema.pick(mask).shape);
        }
      }

      static omit(
        mask:
          | string
          | {
              [key in keyof typeof this._schema]: true | undefined;
            },
        ...masks: string[]
      ) {
        if (typeof mask === "string") {
          return Z.class(
            this._schema.omit({
              [mask]: true,
              ...Object.fromEntries(masks.map((m) => [m, true])),
            } as {
              [key in keyof typeof this._schema]: true | undefined;
            }).shape
          );
        } else {
          return Z.class(this._schema.omit(mask).shape);
        }
      }
      static partial = (mask: any) => this._schema.partial(mask);
      static deepPartial = () => this._schema.deepPartial();
      static passthrough = () => this._schema.passthrough();
      static keyof = () => this._schema.keyof();

      // CAN create a sub-type
      static required() {
        return this.extend(this._schema.required().shape);
      }
      static strict() {
        return this.extend(this._schema.strict().shape);
      }
      static strip() {
        return this.extend(this._schema.strip().shape);
      }
      static catchall(type: any) {
        return this.extend(this._schema.catchall(type).shape);
      }

      // combinators
      static optional() {
        return new ZodOptional(this as any);
      }
      static nullable() {
        return new ZodNullable(this as any);
      }
      static nullish() {
        return this.optional().nullable();
      }
      static array() {
        return new ZodArray(this as any);
      }
      static promise() {
        return new ZodPromise(this as any);
      }

      static or(other: ZodType) {
        return z.union([this as any, other]);
      }

      static and(other: ZodType) {
        return z.intersection(this as any, other);
      }

      // TODO:
      // static transform()
      // static default
      // static brand
      // static catch

      static describe(description: string) {}

      static parse(value: unknown, params?: Partial<ParseParams>) {
        const parsed = this._schema.parse(value, params);
        return _newInstance(this, parsed);
      }

      static parseAsync(value: unknown, params?: Partial<ParseParams>) {
        return this._schema
          .parseAsync(value, params)
          .then((parsed) => _newInstance(this, parsed));
      }

      static _parse(input: ParseInput): ParseReturnType<any> {
        const result = this._schema._parse(input);
        if (isPromise(result)) {
          return result.then((result) =>
            _coerceParseResult(this as any, result)
          );
        } else {
          return _coerceParseResult(this as any, result);
        }
      }

      static _parseSync(input: ParseInput) {
        return _coerceParseResult(this as any, this._schema._parseSync(input));
      }

      static _parseAsync(input: ParseInput) {
        return this._schema
          ._parseAsync(input)
          .then((result) => _coerceParseResult(this as any, result));
      }

      static safeParse(
        value: unknown,
        params?: Partial<ParseParams>
      ): SafeParseReturnType<any, any> {
        return coerceSafeParse(
          this as any,
          this._schema.safeParse(value, params)
        );
      }

      static safeParseAsync(
        value: unknown,
        params?: Partial<ParseParams>
      ): Promise<SafeParseReturnType<any, any>> {
        return this._schema
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
      data: _newInstance(clazz, result.data) as InstanceType<C>,
    };
  } else {
    return result;
  }
}

function _newInstance(clazz: any, parsed: any) {
  const instance = Object.create(clazz.prototype);
  Object.assign(instance, parsed);
  return instance;
}

function _coerceParseResult<C extends ZodClass<any, any, any>>(
  cls: C,
  result: SyncParseReturnType<any>
): SyncParseReturnType<InstanceType<C>> {
  if (result.status === "valid" || result.status === "dirty") {
    return {
      status: result.status,
      value: new cls(result.value as any),
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

function isPromise(obj: any): obj is Promise<any> {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
}
