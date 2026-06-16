export type McpJsonSchema = {
  type: 'object';
  properties: Readonly<Record<string, unknown>>;
  required?: readonly string[];
  additionalProperties: boolean;
};

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: McpJsonSchema;
};

export type McpToolResult = Record<string, unknown>;

export type McpToolHandler = (
  args: Record<string, unknown>
) => Promise<McpToolResult>;

export type McpToolRegistration = McpToolDefinition & {
  handler: McpToolHandler;
  aliases?: string[];
};
