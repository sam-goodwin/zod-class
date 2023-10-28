export function toPascalCase(str: string): string {
  return (
    str
      // Split on non-word characters, underscores, spaces, or boundaries between a lower-case letter and an upper-case letter, or a number and a letter
      .split(/\W|_|\s+|(?<=[a-z])(?=[A-Z])|(?<=[0-9])(?=[A-Za-z])/)
      // Capitalize the first letter of each word and join them together
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
  );
}
