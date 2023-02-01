import { object, ZodObject, ZodRawShape, ZodType } from "zod";

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type ZodValue<T extends ZodType> = T extends ZodType<infer Output>
  ? UnionToIntersection<Output>
  : never;

export interface ZodClass<T extends ZodRawShape>
  extends Omit<ZodObject<T>, "parse"> {
  parse<T extends InstanceType<this> = InstanceType<this>>(value: unknown): T;

  new (data: ZodValue<ZodObject<T>>): ZodValue<ZodObject<T>>;
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
  const schema = object(shape);
  return class {
    constructor(value: ZodValue<ZodObject<T>>) {
      Object.assign(this, schema.parse(value));
    }
  } as any;
}
