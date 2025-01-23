# mcp-jinaai-search

A Model Context Protocol (MCP) server for integrating Jina.ai's Search
API with LLMs. This server provides efficient and comprehensive web
search capabilities, optimised for retrieving clean, LLM-friendly
content from the web.

## Features

- 🔍 Advanced web search through Jina.ai Search API
- 🚀 Fast and efficient content retrieval
- 📄 Clean text extraction with preserved structure
- 🧠 Content optimised for LLMs
- 🌐 Support for various content types including documentation
- 🏗️ Built on the Model Context Protocol
- 🔄 Configurable caching for performance
- 🖼️ Optional image and link gathering
- 🌍 Localisation support through browser locale
- 🎯 Token budget control for response size

## Configuration

This server requires configuration through your MCP client. Here are
examples for different environments:

### Cline Configuration

Add this to your Cline MCP settings:

```json
{
	"mcpServers": {
		"jinaai-search": {
			"command": "node",
			"args": ["-y", "mcp-jinaai-search"],
			"env": {
				"JINAAI_API_KEY": "your-jinaai-api-key"
			}
		}
	}
}
```

### Claude Desktop with WSL Configuration

For WSL environments, add this to your Claude Desktop configuration:

```json
{
	"mcpServers": {
		"jinaai-search": {
			"command": "wsl.exe",
			"args": [
				"bash",
				"-c",
				"JINAAI_API_KEY=your-jinaai-api-key npx mcp-jinaai-search"
			]
		}
	}
}
```

### Environment Variables

The server requires the following environment variable:

- `JINAAI_API_KEY`: Your Jina.ai API key (required)

## API

The server implements a single MCP tool with configurable parameters:

### search

Search the web and get clean, LLM-friendly content using Jina.ai
Reader. Returns top 5 results with URLs and clean content.

Parameters:

- `query` (string, required): Search query
- `format` (string, optional): Response format ("json" or "text").
  Defaults to "text"
- `no_cache` (boolean, optional): Bypass cache for fresh results.
  Defaults to false
- `token_budget` (number, optional): Maximum number of tokens for this
  request
- `browser_locale` (string, optional): Browser locale for rendering
  content
- `stream` (boolean, optional): Enable stream mode for large pages.
  Defaults to false
- `gather_links` (boolean, optional): Gather all links at the end of
  response. Defaults to false
- `gather_images` (boolean, optional): Gather all images at the end of
  response. Defaults to false
- `image_caption` (boolean, optional): Caption images in the content.
  Defaults to false
- `enable_iframe` (boolean, optional): Extract content from iframes.
  Defaults to false
- `enable_shadow_dom` (boolean, optional): Extract content from shadow
  DOM. Defaults to false
- `resolve_redirects` (boolean, optional): Follow redirect chains to
  final URL. Defaults to true

## Development

### Setup

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm run build
```

4. Run in development mode:

```bash
pnpm run dev
```

### Publishing

1. Create a changeset:

```bash
pnpm changeset
```

2. Version the package:

```bash
pnpm version
```

3. Build and publish:

```bash
pnpm release
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on the
  [Model Context Protocol](https://github.com/modelcontextprotocol)
- Powered by [Jina.ai Search API](https://jina.ai)
