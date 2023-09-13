import {
  object,
  ZodObject,
  ZodRawShape,
  ZodType,
  ParseParams,
  SafeParseReturnType,
  z,
} from "zod";

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type ZodValue<T extends ZodType> = T extends ZodType<infer Output>
  ? UnionToIntersection<Output>
  : never;

type Ctor<Shape extends ZodRawShape = ZodRawShape, Self = any> = {
  shape: Shape;
  schema: ZodObject<Shape>;
  new (input: any): Self;
};

export function $<Super extends Ctor>(
  Super: Super
): {
  extend<Shape extends ZodRawShape>(
    shape: Shape
  ): ZodClass<Omit<Super["shape"], keyof Shape> & Shape, InstanceType<Super>>;
} {
  return {
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
}

export interface ZodClass<T extends ZodRawShape, Self = {}>
  extends Omit<
    ZodObject<T>,
    "parse" | "parseAsync" | "safeParse" | "safeParseAsync"
  > {
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
export function ZodClass<T extends ZodRawShape>(shape: T): ZodClass<T> {
  const _schema = object(shape);
  return class {
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
}

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
