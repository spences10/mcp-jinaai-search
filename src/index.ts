#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
	readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
);
const { name, version } = pkg;

const API_KEY = process.env.JINAAI_API_KEY;
if (!API_KEY) {
	throw new Error('JINAAI_API_KEY environment variable is required');
}

const search_tool_schema = {
	name: 'search',
	description:
		'Search the web and get clean, LLM-friendly content using Jina.ai Reader',
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Search query',
			},
			format: {
				type: 'string',
				description: 'Response format (json or text)',
				enum: ['json', 'text'],
				default: 'text',
			},
		},
		required: ['query'],
	},
};

class JinaSearchServer {
	private server: Server;

	constructor() {
		this.server = new Server(
			{
				name,
				version,
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		this.setup_handlers();
		this.server.onerror = (error) =>
			console.error('[MCP Error]', error);
	}

	private setup_handlers() {
		this.server.setRequestHandler(
			ListToolsRequestSchema,
			async () => ({
				tools: [search_tool_schema],
			}),
		);

		this.server.setRequestHandler(
			CallToolRequestSchema,
			async (request) => {
				if (request.params.name !== 'search') {
					throw new McpError(
						ErrorCode.MethodNotFound,
						`Unknown tool: ${request.params.name}`,
					);
				}

				const arguments_record = request.params.arguments as {
					query: string;
					format?: 'json' | 'text';
				};
				const { query, format = 'text' } = arguments_record;
				const search_url = `https://s.jina.ai/${encodeURIComponent(
					query,
				)}`;

				try {
					const response = await fetch(search_url, {
						headers: {
							Authorization: `Bearer ${API_KEY}`,
							Accept:
								format === 'json' ? 'application/json' : 'text/plain',
						},
					});

					if (!response.ok) {
						const error_text = await response.text();
						throw new Error(error_text);
					}

					const result =
						format === 'json'
							? await response.json()
							: await response.text();

					return {
						content: [
							{
								type: 'text',
								text: format === 'json'
									? JSON.stringify(result, null, 2)
									: result,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: 'text',
								text: `Jina.ai API error: ${
									error instanceof Error
										? error.message
										: String(error)
								}`,
							},
						],
						isError: true,
					};
				}
			},
		);
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('Jina Search MCP server running on stdio');
	}
}

const server = new JinaSearchServer();
server.run().catch((error) => {
	console.error('Failed to start server:', error);
	process.exit(1);
});
