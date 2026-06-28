---
name: file-operation-tools
description: Safe workflow for AI agents that can call file operation tools. Use when designing, reviewing, or applying prompts/tool rules for reading files, writing files, appending content, listing directories, modifying existing files, or handling risky file operations such as overwrite, deletion, cleanup, batch changes, and sensitive configuration edits.
---

# File Operation Tools

## Purpose

Use this skill to guide an AI agent that has access to file operation tools. Apply the rules below to decide when to read, write, append, list, ask for clarification, or require confirmation before a risky action.

## Tool Model

Assume these generic tools unless the runtime provides different names:

- `read_file(path)`: Read a file without changing it.
- `write_file(path, content)`: Create a file or overwrite an existing file.
- `append_file(path, content)`: Add content to the end of a file.
- `list_files(path)`: List files and folders in a directory.

Adapt the tool names to the actual environment, but keep the same safety behavior.

## Core Rules

- Use tools only when the user's request requires filesystem state.
- Read without writing when the user asks to view, analyze, summarize, inspect, or explain a file.
- Before modifying an existing file, read it first and preserve its structure, formatting, style, and unrelated content.
- Modify only the scope requested by the user.
- Do not guess missing paths, filenames, or write content. Ask for the missing information.
- Do not claim that an operation succeeded unless the tool actually succeeded.
- Convert tool results into a concise user-facing reply.
- When a tool fails, explain the failure plainly and ask for the next needed input.

## Intent Routing

- For "view", "read", "open", "inspect", "analyze", "summarize", or "explain a file": call `read_file`.
- For "list", "show directory", "what files are here", or "find a file": call `list_files`.
- For "create", "new file", "generate", "save as", or "write into a file": call `write_file` after confirming `path` and `content`.
- For "modify", "update", "replace", "fix", or "adjust a file": call `read_file`, produce a minimal edit, then call `write_file` with the complete updated content.
- For "append", "add to the end", or "add after existing content": call `append_file` after confirming `path` and appended content.
- For "overwrite", "clear", "delete", "batch edit", or large replacements: treat as high risk and require confirmation first.

## High-Risk Actions

Require explicit user confirmation before:

- Overwriting most or all of an existing file.
- Clearing file contents.
- Deleting files or directories.
- Recursively moving, renaming, or modifying many files.
- Editing sensitive files such as environment files, deployment scripts, database migrations, credentials, or production configuration.
- Proceeding when the user intent is ambiguous and data loss is possible.

Use a short confirmation question that names the risk, for example:

```text
This will overwrite the existing file content. Please confirm whether to continue.
```

## Workflows

### Reading

1. Confirm the file path is known.
2. Call `read_file(path)`.
3. Answer according to the user's request.
4. Do not modify the file.

### Writing

1. Confirm the target path and content are known.
2. Determine whether the target may already exist.
3. If overwrite risk is unclear or high, ask for confirmation.
4. Call `write_file(path, content)`.
5. Report the created or written file.

### Modifying

1. Confirm the file path and requested change are known.
2. Call `read_file(path)`.
3. Make the smallest change that satisfies the request.
4. Preserve unrelated content and local style.
5. If the change is broad or risky, ask for confirmation before writing.
6. Call `write_file(path, updated_content)`.
7. Summarize what changed.

### Appending

1. Confirm the file path and appended content are known.
2. Call `append_file(path, content)`.
3. Report that the content was appended.

### Listing

1. Confirm the directory path, or use the environment's default workspace if that is appropriate.
2. Call `list_files(path)`.
3. Summarize the relevant files or ask the user to choose from candidates.

## Response Style

- Be concise and concrete.
- Do not expose hidden reasoning.
- Do not invent tool outputs.
- Say what was read, written, modified, appended, or left unchanged.
- If no operation was executed, state what information is still needed.
