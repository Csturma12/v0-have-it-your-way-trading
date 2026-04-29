import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";
import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

const client = new Anthropic();

// Get config from environment
const PROJECT_PATH = process.env.PROJECT_PATH || "/path/to/your/nextjs/project";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "username/repo"

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const git = simpleGit(PROJECT_PATH);

export async function POST(req: Request) {
  const { message } = await req.json();

  const tools = [
    {
      name: "read_file",
      description: "Read a file from the target project",
      input_schema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to project root" }
        },
        required: ["path"]
      }
    },
    {
      name: "write_file",
      description: "Write or modify a file in the target project",
      input_schema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      }
    },
    {
      name: "create_branch",
      description: "Create a new git branch",
      input_schema: {
        type: "object",
        properties: {
          branch_name: { type: "string" }
        },
        required: ["branch_name"]
      }
    },
    {
      name: "commit_and_push",
      description: "Commit and push changes to GitHub",
      input_schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          branch_name: { type: "string" }
        },
        required: ["message", "branch_name"]
      }
    },
    {
      name: "create_pull_request",
      description: "Create a pull request on GitHub",
      input_schema: {
        type: "object",
        properties: {
          branch_name: { type: "string" },
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["branch_name", "title", "description"]
      }
    },
    {
      name: "get_preview_url",
      description: "Get the Vercel preview deployment URL",
      input_schema: {
        type: "object",
        properties: {
          branch_name: { type: "string" }
        },
        required: ["branch_name"]
      }
    },
    {
      name: "list_files",
      description: "List files in a directory",
      input_schema: {
        type: "object",
        properties: {
          dir: { type: "string", description: "Directory path" }
        },
        required: ["dir"]
      }
    }
  ];

  async function executeTool(
    toolName: string,
    toolInput: Record<string, string>
  ): Promise<string> {
    try {
      switch (toolName) {
        case "read_file": {
          const fullPath = path.join(PROJECT_PATH, toolInput.path);
          const content = fs.readFileSync(fullPath, "utf-8");
          return content;
        }

        case "write_file": {
          const fullPath = path.join(PROJECT_PATH, toolInput.path);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, toolInput.content);
          return `✅ File written: ${toolInput.path}`;
        }

        case "list_files": {
          const fullPath = path.join(PROJECT_PATH, toolInput.dir);
          const files = fs.readdirSync(fullPath);
          return files.join("\n");
        }

        case "create_branch": {
          await git.checkoutLocalBranch(toolInput.branch_name);
          return `✅ Branch created: ${toolInput.branch_name}`;
        }

        case "commit_and_push": {
          await git.add(".");
          await git.commit(toolInput.message);
          await git.push("origin", toolInput.branch_name, ["--set-upstream"]);
          return `✅ Pushed to ${toolInput.branch_name}`;
        }

        case "create_pull_request": {
          const [owner, repo] = GITHUB_REPO!.split("/");
          const pr = await octokit.rest.pulls.create({
            owner,
            repo,
            title: toolInput.title,
            body: toolInput.description,
            head: toolInput.branch_name,
            base: "main"
          });
          return `✅ PR created: ${pr.data.html_url}`;
        }

        case "get_preview_url": {
          const projectName = process.env.VERCEL_PROJECT_NAME;
          const cleanBranch = toolInput.branch_name.replace(/\//g, "-");
          const previewUrl = `https://${cleanBranch}.${projectName}.vercel.app`;
          return previewUrl;
        }

        default:
          return "Unknown tool";
      }
    } catch (error) {
      return `❌ Error: ${(error as Error).message}`;
    }
  }

  // Agentic loop
  let messages: any[] = [{ role: "user", content: message }];

  const systemPrompt = `You are a helpful coding assistant for a Next.js project.
Your job is to:
1. Read files when asked
2. Modify code based on user requests
3. Create feature branches
4. Commit and push changes
5. Create pull requests
6. Provide preview URLs

When making changes:
- Always read the file first to understand context
- Make minimal, focused changes
- Create descriptive commit messages
- Ask for confirmation before creating PRs

Current project: ${PROJECT_PATH}`;

  let response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    system: systemPrompt,
    tools: tools as any,
    messages
  });

  // Process tool calls
  while (response.stop_reason === "tool_use") {
    const toolUseBlock = response.content.find(
      (block: any) => block.type === "tool_use"
    );

    if (!toolUseBlock) break;

    const toolResult = await executeTool(
      toolUseBlock.name,
      toolUseBlock.input
    );

    messages = [
      { role: "user", content: message },
      { role: "assistant", content: response.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: toolResult
          }
        ]
      }
    ];

    response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools as any,
      messages
    });
  }

  const finalResponse = response.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n");

  return Response.json({ response: finalResponse });
}
