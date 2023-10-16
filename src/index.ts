import {
  object,
  ZodObject,
  ZodRawShape,
  ZodType,
  ParseParams,
  SafeParseReturnType,
  z,
} from "zod";

const IS_ZOD_CLASS = Symbol.for("zod-class");

type Ctor<Shape extends ZodRawShape = ZodRawShape, Self = any> = {
  [IS_ZOD_CLASS]: true;
  shape: Shape;
  schema: ZodObject<Shape>;
  parse(value: unknown): Self;
  new (input: any): Self;
};

export function isZodClass(a: any): a is Ctor {
  return typeof a === "function" && a[IS_ZOD_CLASS];
}

export interface Z {
  class<T extends ZodRawShape>(shape: T): ZodClass<T>;
  <Super extends Ctor>(Super: Super): {
    parse(value: unknown): InstanceType<Super>;
    extend<Shape extends ZodRawShape>(
      shape: Shape
    ): ZodClass<Omit<Super["shape"], keyof Shape> & Shape, InstanceType<Super>>;
  };
}

export const Z = (function <Super extends Ctor>(
  Super: Super
): {
  parse(value: unknown): InstanceType<Super>;
  extend<Shape extends ZodRawShape>(
    shape: Shape
  ): ZodClass<Omit<Super["shape"], keyof Shape> & Shape, InstanceType<Super>>;
} {
  return {
    parse(value: unknown) {
      return Super.parse(value) as any;
    },
    extend<Shape extends ZodRawShape>(augmentation: Shape) {
      const augmented = Super.schema.extend(augmentation);
      // @ts-ignore
      return class extends Super {
        static schema = augmented;
        constructor(value: any) {
          super(value);
          Object.assign(this, augmented.parse(value));
        }
      } as any;
    },
  };
} as any) as Z;

export interface ZodClass<T extends ZodRawShape, Self = {}>
  extends Omit<
    ZodObject<T>,
    "parse" | "parseAsync" | "safeParse" | "safeParseAsync"
  > {
  [IS_ZOD_CLASS]: true;
  shape: T;
  schema: ZodObject<T>;
  parse<T extends InstanceType<this> = InstanceType<this>>(value: unknown): T;
  parseAsync<Output extends InstanceType<this> = InstanceType<this>>(
    value: unknown
  ): Promise<Output>;
  safeParse<Output extends InstanceType<this> = InstanceType<this>>(
    data: unknown,
    params?: Partial<ParseParams>
  ): SafeParseReturnType<ZodValue<ZodObject<T>>, Output>;
  safeParseAsync<Output extends InstanceType<this> = InstanceType<this>>(
    value: unknown
  ): Promise<SafeParseReturnType<ZodValue<ZodObject<T>>, Output>>;

  new (data: ZodValue<ZodObject<T>>): Self & ZodValue<ZodObject<T>>;
}

/**
 * Creates a class and a Zod schema in one line.
 *
 * ```ts
 * class HelloObject extends ZodClass({
 *   key: z.string()
 * }) { }
 *
 * new HelloObject({
 *   key: "key"
 * })
 * ```
 * @param shape
 * @returns
 */
Z["class"] = function <T extends ZodRawShape>(shape: T): ZodClass<T> {
  const _schema = object(shape);
  return class {
    static [IS_ZOD_CLASS]: true = true;
    static schema = _schema;
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
        (this as any) as ZodClass<T>,
        this.schema.safeParse(value, params)
      );
    }

    static safeParseAsync(
      value: unknown,
      params?: Partial<ParseParams>
    ): Promise<SafeParseReturnType<any, any>> {
      return this.schema
        .safeParseAsync(value, params)
        .then((result) =>
          coerceSafeParse((this as any) as ZodClass<T>, result)
        );
    }

    constructor(value: ZodValue<ZodObject<T>>) {
      Object.assign(this, _schema.parse(value));
    }
  } as any;
};

function coerceSafeParse<C extends ZodClass<any>>(
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
