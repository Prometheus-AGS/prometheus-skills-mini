Accessed: 2026-09-24
Source: https://www.deepseek.com/harness/en/
Retrieved with Firecrawl maxAge=0.

[Harness](https://www.deepseek.com/harness/en/)

中文EN

中文EN

DeepSeek Harness developer preview

# Everything is a plugin

DeepSeek Harness is now in developer preview for agent harness developers worldwide — source code included.

Every capability is a plugin that can be swapped or recomposed: models, tools, skills, sessions, sandboxes, storage, loops, scheduling, and the UI.

[View on GitHub](https://github.com/deepseek-ai/deepseek-harness) [Developer docs](https://deepseek-harness.github.io/deepseek-harness/en/guide/quickstart) [Community plugins](https://github.com/topics/dsh-plugin) [Cordis paper](https://arxiv.org/abs/2608.25512)

Quick startInstall from source

Copy

```
$ npx @deepseek-ai/dsh web
```

```
$ git clone https://github.com/deepseek-ai/deepseek-harness
```

[View on GitHub](https://github.com/deepseek-ai/deepseek-harness) [Developer docs](https://deepseek-harness.github.io/deepseek-harness/en/guide/quickstart) [Community plugins](https://github.com/topics/dsh-plugin) [Cordis paper](https://arxiv.org/abs/2608.25512)

Agent = Model + Harness

## Harness  keeps agents working in real-world environments

The model is the soul of an agent.

A harness lets an agent understand its environment, use tools, and keep working in real-world settings.

### [Cordis kernel](https://github.com/cordiverse/cordis)

The Cordis kernel manages plugin mounting, unmounting, and dependencies. Agent capabilities live in the plugins.

### Capabilities as plugins

Plugins provide every agent capability, including models, tools, skills, sessions, sandboxes, storage, loops, scheduling, and the UI. Cordis services and events let the plugins work together.

### Compose with configuration

Developers can select, swap, or extend any capability in configuration without changing the DeepSeek Harness source code.

Design approach

## Everything is a plugin. Every run is traceable.

### Everything is a plugin

DeepSeek Harness is built on [Cordis](https://github.com/cordiverse/cordis)'s plugin system. Plugins provide every agent capability, including models, tools, skills, sessions, sandboxes, storage, loops, scheduling, and the UI. Cordis services and events let the plugins work together. Developers can select, swap, or extend any capability in configuration without changing the DeepSeek Harness source code.

### Every run is traceable

Everything the model sees is recorded in an append-only session log: system prompts, reasoning, tool calls and results, subagent scheduling, and every context injection. In the Trajectory view, you can inspect these records by source. Resume, fork, search, and replay all operate on the same event stream.

### Multiple runtime modes

Standard mode includes the full toolset. Code mode uses model-generated code to orchestrate multiple rounds of tool calls. Minimal mode keeps only a shell tool and a file editor for benchmarking models in a minimal environment. Creator mode lets you inspect the current runtime, test Cordis plugins in memory, and combine them into new modes.

![DeepSeek Harness settings showing installed plugins and their status](https://www.deepseek.com/harness/images/harness/feat-plugin.en.png)

![Reconstruct a complete run from a single session log](https://www.deepseek.com/harness/images/harness/trajectory-real-view.en.png)

dsh-demoCreator mode

Describe what you want to build

Standard mode

Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.

Code mode

All Standard mode capabilities, with tools exposed through the Code Mode SDK so the model can combine multi-step operations in one TypeScript program.

Minimal mode

Two-tool coding agent with persistent bash and str\_replace\_editor.

Creator mode

Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.

Design approach

## Everything is a plugin. Every run is traceable.

### Everything is a plugin

DeepSeek Harness is built on [Cordis](https://github.com/cordiverse/cordis)'s plugin system. Plugins provide every agent capability, including models, tools, skills, sessions, sandboxes, storage, loops, scheduling, and the UI. Cordis services and events let the plugins work together. Developers can select, swap, or extend any capability in configuration without changing the DeepSeek Harness source code.

![DeepSeek Harness settings showing installed plugins and their status](https://www.deepseek.com/harness/images/harness/feat-plugin.en.png)

### Every run is traceable

Everything the model sees is recorded in an append-only session log: system prompts, reasoning, tool calls and results, subagent scheduling, and every context injection. In the Trajectory view, you can inspect these records by source. Resume, fork, search, and replay all operate on the same event stream.

![Reconstruct a complete run from a single session log](https://www.deepseek.com/harness/images/harness/trajectory-real-view.en.png)

### Multiple runtime modes

Standard mode includes the full toolset. Code mode uses model-generated code to orchestrate multiple rounds of tool calls. Minimal mode keeps only a shell tool and a file editor for benchmarking models in a minimal environment. Creator mode lets you inspect the current runtime, test Cordis plugins in memory, and combine them into new modes.

dsh-demoCreator mode

Describe what you want to build

Standard mode

Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.

Code mode

All Standard mode capabilities, with tools exposed through the Code Mode SDK so the model can combine multi-step operations in one TypeScript program.

Minimal mode

Two-tool coding agent with persistent bash and str\_replace\_editor.

Creator mode

Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.

## Customize your DeepSeek Harness

PlayPause

PlayPause

en0:00

0:00 / 0:001x

Playback rate

Enter fullscreen modeExit fullscreen mode

Get started

## Try it now or install from source

### Quick start

Install Node.js, then launch the Web UI with npx.

`$ npx @deepseek-ai/dsh web`Copy

### Install from source

Clone the full source and follow the setup instructions in the repository.

`$ git clone https://github.com/deepseek-ai/deepseek-harness`Copy

## Join the DSH plugin ecosystem

DeepSeek Harness remains in developer preview and is still being tested by developers building agent harnesses. Its core plugins and APIs will continue to evolve. We look forward to exploring the limits of intelligence with developers worldwide using open-source infrastructure that is reusable and composable.

[View on GitHub](https://github.com/deepseek-ai/deepseek-harness) [Developer docs](https://deepseek-harness.github.io/deepseek-harness/en/guide/quickstart) [Community plugins](https://github.com/topics/dsh-plugin)
