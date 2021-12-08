# XX-CLI &middot; ![GitHub](https://img.shields.io/github/license/xx1115/cli) ![codecov](https://codecov.io/gh/xx1115/cli/branch/main/graph/badge.svg?token=SY0FKTCUBZ)

`xx-cli` is a scaffolding solution that includes project initialization, Git integration, ONE-click deployment of OSS and CDN.

## Why

In the process of our development, we often encounter some repetitive labor. Repeated labor is prone to errors and redundant workload. We use scaffolding to reduce the workload due to human reasons and allow more time for development. Do meaningful things.

## Installation
```bash
npm install -g @xx1115/cli
```

## Usage

```bash
➜ xx

Usage: xx <command> [options]

A scaffolding for an engineered solution

Options:
  -d, --debug          Whether to enable debugging mode (default: false)
  -l, --local <local>  Specify the local debug file path (default: "")
  -V, --version        output the version number
  -h, --help           display help for command

Commands:
  init [options]       Initialize a project
  create [options]     Create a project
  commit [options]     handle git flow
  kill <port>          Kills the port number of the corresponding process
  help [command]       display help for command
```

