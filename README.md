# zod-class

This is a small utility library to accompany [Zod](https://github.com/colinhacks/zod) that enables Types and Schemas to be defined in one line by creating a Class.

## Installation

```
npm install zod-class
```

## Usage

1. Define a new class

```ts
import z from "zod";
import { Z } from "zod-class";

// define a class using a zod schema
export class Hello extends Z.class({
  name: z.string(),
}) {
  get getMessage() {
    return `hello ${name}`
  }
}

const hello = new Hello({
  hello: "sam",
});
```

2. Parse a value to an instance of a ZodClass
```ts
const hello = Hello.parse(someVal)

// use method on the instance 
const message = hello.getMessage();
```

3. Extend a class

```ts
export class World extends Hello.extend({
  world: z.string()
}) {}

const world = new World({
  hello: "world",
  world: "hello"
});
```

4. Access A ZodClass's property to re-use in other schemas

```ts
import { z } from "zod";
import { Z } from "zod-class";

export class Product extends Z.class({
  id: z.string().brand<"ProductId">,
  price: z.number().min(1)
}) {}

export class Order extends Z.class({
  id: z.string().brand<"OrderId">,
  productId: Product.shape.id // 👈 Re-using the branded type `id` from `Product` class 
}) {}


Product.Id // 👈 Properties are also available in friendly pascal case directly on the class constructor
```

## Why?

It can be annoying to always have redundant declarations for types and schemas:

1. the `z.object` declaration
2. the derived type using `z.infer`

```ts
interface HelloSchema extends z.infer<typeof HelloSchema> {}
const HelloSchema = z.object({
  key: z.string(),
});
```

`zod-class` enables this to be achieved in a single line.

It also provides a class that can be instantiated and methods added to.

```ts
export class Person extends Z.class({
  firstName: z.string(),
  lastName: z.string(),
}) {
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
```



## Workarounds

Creating a class that adequately sub-types a Zod Schema is difficult because of how Zod is implemented. `zod-class` covers the most common use-cases but there are holes.

If you encounter a problem with type errors, you can always workaround it with the `schema()` method.

For example, if you have a function that expects a `ZodType<T>`:
```ts
function createDTO<T>(schema: ZodType<T>): DTO<T>;
```

And a class, `User`, constructed with `Z.class`:
```ts
class User extends Z.class({
  username: z.string()
}) {}

```

You should be able to just pass `User` in
```ts
const UserDTO = createDTO(User);
```

In some cases, this can error. To workaround, call `User.schema()` instead:
```ts
const UserDTO = createDTO(User.schema());
```

See relevant issue: [#17](https://github.com/sam-goodwin/zod-class/issues/17)

2. `nullish` will not create a schema that returns an instance of the ZodClass

ZodClass does not provide a type-safe implementation of `schema.nullish()`.

```ts
User.nullish().parse(value) 
```

This will not return an instance of `User`:
```ts
{ username: string } | null | undefined
```

Workaround with `User.schema()`
```ts
User.schema().nullish().parse(value) // User | null | undefined
```