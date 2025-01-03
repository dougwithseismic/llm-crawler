/**
 * A mapping object that defines functions to describe different Zod schema types.
 * Each function takes a schema and a describeSchema function as arguments and returns a string description.
 */
const typeMapping: {
  [key: string]: (schema: any, describeSchema: any) => string;
} = {
  ZodObject: (schema: any, describeSchema: any) =>
    `{ ${Object.entries(schema.shape)
      .map(([key, value]) => `${key}: ${describeSchema(value)}`)
      .join(', ')} }`,
  ZodArray: (schema: any, describeSchema: any) =>
    `[${describeSchema(schema._def.type)}] (${schema._def.description || 'No description'})`,
  ZodString: (schema: any) =>
    `string (${schema._def.description || 'No description'})`,
  ZodNumber: (schema: any) =>
    `number (${schema._def.description || 'No description'})`,
  default: (schema: any) =>
    `unknown (${schema._def.description || 'No description'})`,
};

/**
 * Generates a descriptive prompt from a given Zod schema.
 *
 * @param {any} schema - The Zod schema to describe.
 * @returns {string} - A descriptive prompt string based on the schema.
 *
 * @example
 * const schema = z.object({
 *   name: z.string().describe("The person's name"),
 *   age: z.number().describe("The person's age"),
 *   hobbies: z.array(z.string().describe("A hobby")).describe("List of hobbies")
 * });
 *
 * const prompt = generatePromptFromSchema(schema);
 * console.log(prompt);
 * // Output:
 * // Hey GPT, here's the schema: { name: string (The person's name), age: number (The person's age), hobbies: [string (A hobby)] (List of hobbies) }. Gotta do some stuff, give me the output I can use.
 */
const generatePromptFromSchema = (schema: any): string => {
  const describeSchema = (schema: any): string => {
    const schemaType = schema.constructor.name;
    const describeFunction = typeMapping[schemaType] || typeMapping.default;
    return describeFunction(schema, describeSchema);
  };

  const schemaDescription = describeSchema(schema);
  return `${schemaDescription}`.trim();
};

export default generatePromptFromSchema;
