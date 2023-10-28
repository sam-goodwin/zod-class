import { toPascalCase } from "../src/to-pascal-case.js";

describe("toPascalCase", () => {
  it("should handle single word property names", () => {
    expect(toPascalCase("id")).toBe("Id");
    expect(toPascalCase("product")).toBe("Product");
  });

  it("should handle camelCase property names", () => {
    expect(toPascalCase("productId")).toBe("ProductId");
    expect(toPascalCase("isAvailable")).toBe("IsAvailable");
    expect(toPascalCase("orderCount")).toBe("OrderCount");
  });

  it("should handle snake_case property names", () => {
    expect(toPascalCase("product_id")).toBe("ProductId");
    expect(toPascalCase("is_available")).toBe("IsAvailable");
    expect(toPascalCase("order_count")).toBe("OrderCount");
  });

  it("should handle property names with numbers", () => {
    expect(toPascalCase("product1")).toBe("Product1");
    expect(toPascalCase("order2Count")).toBe("Order2Count");
    expect(toPascalCase("product_3_id")).toBe("Product3Id");
  });

  it("should convert regular words to PascalCase", () => {
    expect(toPascalCase("hello world")).toBe("HelloWorld");
  });

  it("should handle uppercase words", () => {
    expect(toPascalCase("HELLO WORLD")).toBe("HelloWorld");
  });

  it("should handle underscores", () => {
    expect(toPascalCase("hello_world")).toBe("HelloWorld");
  });

  it("should handle hyphens", () => {
    expect(toPascalCase("hello-world")).toBe("HelloWorld");
  });

  it("should handle multiple non-word characters", () => {
    expect(toPascalCase("hello--world__example")).toBe("HelloWorldExample");
  });

  it("should handle leading and trailing spaces", () => {
    expect(toPascalCase(" hello world ")).toBe("HelloWorld");
  });

  it("should handle empty strings", () => {
    expect(toPascalCase("")).toBe("");
  });
});
