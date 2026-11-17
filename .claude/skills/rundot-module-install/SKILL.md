---
name: rundot-module-install
description: Discover, select, install, wire, and verify pre-built game modules from the RUN catalog (@modules/*). Use when adding game capabilities (audio, physics, UI, data, save, local notifications, error boundaries) to a RUN game.
---

# RUN Game Module Install

Follow this deliberate workflow to discover, install, wire, and verify modules from the catalog into game code.

## Workflow

### 1. Discover Modules
Find candidates using search or natural language recommendations:
```bash
rundot module search "notifications" --json
rundot module recommend "I need local reminder notifications and error handling" --json
```

### 2. Inspect Details & Requirements
Inspect the module details, peer dependencies, and whether it requires configuration:
```bash
rundot module show data/local-notifications --json
```
If `configurable: true` or `configSchema` is present, note the required configuration fields.

### 3. Decide with the User
Present candidate module(s), their capabilities, and any configuration choices to the user before installing. Confirm module selection and values for any configurable settings.

### 4. Install with Catalog Version & Config
Install the approved module(s) pinned to the catalog version returned from discovery.
For configurable modules, provide settings via `--config-file <path>` (or `-` for stdin):
```bash
# Prepare config.json containing { "<moduleId>": { ...settings } }
rundot module add data/local-notifications --catalog-version <version> --config-file config.json
```
For non-configurable modules:
```bash
rundot module add ui/error-boundary --catalog-version <version>
```
`module add` performs:
- Dependency resolution across the DAG.
- Configuration validation against module schema before writing.
- Settings write to `src/config/modules/<category>/<folder>.json`.
- Atomic transaction rollbacks on failure.

### 5. Read Installed Documentation
Read the module's installed contract and API guide:
```bash
cat src/modules/<category>/<folder>/SKILL.md
```

### 6. Wire into Game Code
- Import the module via `@modules/<category>/<folder>` in game files under `src/`.
- If the module declares `wiring.uses` in `module.json`, import and use one of those specified functions.
- If configurable, import the written settings from `src/config/modules/<category>/<folder>.json` (or via `@config/` alias).
- Never edit files in `src/modules/` directly without ejecting.

### 7. Verify Integration
Run module verification to ensure all value imports, usages, and settings imports are wired correctly:
```bash
rundot module verify --json
```
Ensure `verify` exits 0 with `"ok": true`.
