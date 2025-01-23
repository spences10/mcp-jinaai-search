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
		'Search the web and get clean, LLM-friendly content using Jina.ai Reader. Returns top 5 results with URLs and clean content.',
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
			no_cache: {
				type: 'boolean',
				description: 'Bypass cache for fresh results',
				default: false,
			},
			token_budget: {
				type: 'number',
				description: 'Maximum number of tokens for this request',
				minimum: 1,
			},
			browser_locale: {
				type: 'string',
				description: 'Browser locale for rendering content',
			},
			stream: {
				type: 'boolean',
				description: 'Enable stream mode for large pages',
				default: false,
			},
			gather_links: {
				type: 'boolean',
				description: 'Gather all links at the end of the response',
				default: false,
			},
			gather_images: {
				type: 'boolean',
				description: 'Gather all images at the end of the response',
				default: false,
			},
			image_caption: {
				type: 'boolean',
				description: 'Caption images in the content',
				default: false,
			},
			enable_iframe: {
				type: 'boolean',
				description: 'Extract content from iframes',
				default: false,
			},
			enable_shadow_dom: {
				type: 'boolean',
				description: 'Extract content from shadow DOM',
				default: false,
			},
			resolve_redirects: {
				type: 'boolean',
				description: 'Follow redirect chains to final URL',
				default: true,
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
					no_cache?: boolean;
					token_budget?: number;
					browser_locale?: string;
					stream?: boolean;
					gather_links?: boolean;
					gather_images?: boolean;
					image_caption?: boolean;
					enable_iframe?: boolean;
					enable_shadow_dom?: boolean;
					resolve_redirects?: boolean;
				};
				const {
					query,
					format = 'text',
					no_cache = false,
					token_budget,
					browser_locale,
					stream = false,
					gather_links = false,
					gather_images = false,
					image_caption = false,
					enable_iframe = false,
					enable_shadow_dom = false,
					resolve_redirects = true,
				} = arguments_record;
				const search_url = `https://s.jina.ai/${encodeURIComponent(
					query,
				)}`;

				const headers: Record<string, string> = {
					Authorization: `Bearer ${API_KEY}`,
					Accept:
						format === 'json' ? 'application/json' : 'text/plain',
				};

				if (no_cache) {
					headers['X-Bypass-Cache'] = 'true';
				}
				if (token_budget) {
					headers['X-Token-Budget'] = token_budget.toString();
				}
				if (browser_locale) {
					headers['X-Browser-Locale'] = browser_locale;
				}
				if (stream) {
					headers['X-Stream-Mode'] = 'true';
				}
				if (gather_links) {
					headers['X-Gather-Links'] = 'true';
				}
				if (gather_images) {
					headers['X-Gather-Images'] = 'true';
				}
				if (image_caption) {
					headers['X-Image-Caption'] = 'true';
				}
				if (enable_iframe) {
					headers['X-Enable-Iframe'] = 'true';
				}
				if (enable_shadow_dom) {
					headers['X-Enable-Shadow-DOM'] = 'true';
				}
				if (!resolve_redirects) {
					headers['X-No-Redirect'] = 'true';
				}

				try {
					const response = await fetch(search_url, {
						method: 'POST',
						headers,
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
								text:
									format === 'json'
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
