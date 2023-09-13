# zod-class

This is a small utility library to accompany [Zod](https://github.com/colinhacks/zod) to enable for Types and Schemas to be defined in one line by creating a Class.

## Installation

```
npm install zod-class
```

## Usage


```ts
import z from "zod";
import { ZodClass } from "zod-class";

// define a class using a zod schema
export class Hello extends ZodClass({
  hello: z.string(),
}) {}

const hello = new Hello({
  hello: "sam",
});

// extend a class
export class World extends Hello.extend({
  world: z.string()
}) {}

const world = new World({
  hello: "world",
  world: "hello"
});
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
export class Person extends ZodClass({
  firstName: z.string(),
  lastName: z.string(),
}) {
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

## Caveats

Caveat: the static `HelloSchema.parse`'s return type does not accurately reflect that it returns an instance of the created class,

```ts
const unknownValue: unknown;

// we wish it was `HelloSchema`, not `{ key: string }`.
const hello2: {
  key: string;
} = HelloSchema.parse(unknownValue);
```

Workaround: just cast it

```ts
// option 1
const hello: HelloSchema = HelloSchema.parse(unknownValue);

// option 2
const hello = HelloSchema.parse<HelloSchema>(unknownValue);
```
