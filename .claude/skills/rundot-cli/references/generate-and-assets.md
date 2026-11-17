# Generating assets, and what they cost

`rundot generate` produces game assets from prompts and bills the creator (or
the game) in credits. `rundot assets` lists and deletes what's been generated.
`rundot credits` shows the spend.

## The generate group

Run `rundot generate --help` for the full list; these are the ones creators use.

| Command | What it makes |
|---|---|
| `rundot generate image` | An image from a text prompt. |
| `rundot generate music` | Music from a text prompt. |
| `rundot generate sfx` | A sound effect. |
| `rundot generate video` | A video from a text prompt, a start/end frame, or reference media. Long generations run as an async job; the command waits for it. |
| `rundot generate tts` | Text-to-speech audio. |
| `rundot generate text` | A chat completion from a messages file. |

Discovery / cost commands in the same group: `rundot generate image-models`,
`rundot generate video-models`, `rundot generate text-models`,
`rundot generate list-voices`,
`rundot generate estimate <kind>` (cost of a generation **without** running it).
`design-voice` and `save-voice` are also in the group — `--help` them if a creator asks.

### Flags worth knowing

Almost every generate command shares these:

| Flag | What it does |
|---|---|
| `--prompt "<text>"` | The prompt. **Required** on image / music / sfx / video (new generation). |
| `--out <path>` | Where to write the result. |
| `--game-id <id>` | Bill the game instead of your own creator balance. Omit for creator-billed. |
| `--json` | Machine-readable output. Use it when you're parsing rather than showing. |
| `--model <id>` | Pick a model on image / text (see `rundot generate image-models` / `text-models`). Video and audio pick with `--provider` instead. |

Command-specific ones you'll actually reach for:

- `rundot generate image`: `--aspect-ratio 16:9`, `--seed <n>`,
  `--negative-prompt "<text>"`, `--remove-background`, `--reference-image <ref>`
  (a local path, HTTPS URL, data URI, or creator-storage key; repeatable, up to
  10), `--image-size 1K|2K|4K`.
- `rundot generate music` / `sfx`: `--duration <seconds>` (music requires it,
  3–300; sfx ranges differ per provider).
- `rundot generate video`: `--provider <id>` (default `seedance-2.0`; list with
  `video-models`), `--mode text-to-video|image-to-video|reference-to-video`,
  `--duration <seconds>`, `--aspect-ratio 9:16`, `--resolution 480p|720p|1080p`,
  `--start-image-url` / `--end-image-url` (HTTPS) for image-to-video,
  `--max-credits <n>`, `--idempotency-key <key>`, `--client-ref <ref>`, `--resume`.
- `rundot game animate-3d`: 3D character animation.
  `--input <path>` (local GLB, max 23 MiB), `--source-sha256 <hex>`,
  `--animations idle,walk,run,jump` (1 to 4 presets), `--out-dir <dir>`,
  `--max-credits <n>`, `--client-ref <ref>`, `--resume`.
- `rundot generate tts`: `--text` and `--voice-id` are both **required**.
- `rundot generate text`: `--model` and `--messages-file` are both **required**;
  `--system "<prompt>"` or `--system @path`.

Anything beyond that: `rundot generate <subcommand> --help`. 3D model generation,
remesh, rig, and animation live under `rundot game` (`rundot game generate-3d`,
`remesh-3d`, `rig-3d`, `animate-3d`).

## Studio workflows and receipts

The Studio asset generation workflows support credit spending limits, atomic pending receipts, and recovery without duplicate spends:

- **Spend caps**: `--max-credits <n>` sets an upper limit on credit expenditure.
- **Idempotency and correlation**: `--idempotency-key <key>` and `--client-ref <ref>` prevent duplicate submission and echo correlation identifiers in receipts and events.
- **Private source uploads**: `--input <path>` with `--source-sha256 <hex>` validates file bytes before uploading to private game storage.
- **Atomic receipts**: Every operation writes a `<output>.json` sidecar. The sidecar advances from `"dispatching"` to `"pending"` or `"download_pending"` and finally `"saved"`.
- **Output verification**: Video files (MP4/WebM) and 3D models (GLB2 header and JSON chunk) are fully verified before saving.
- **Resume and recovery**: `--resume` recovers missing output files from known job IDs or response URLs in the sidecar. It never submits a new generation request.

## Credits

`rundot credits` reports usage and balance.

| Flag | What it does |
|---|---|
| `--period today\|this_week\|this_month\|last_month\|all_time` | Window. Default `this_month`. |
| `--group-by service\|model\|app\|consumer` | How to break the total down. Default `service`. |
| `--game-id <id>` | Only this game's usage. |
| `--consumer sdk\|cli\|simulation\|admin` | Only spend from one surface. |

Estimate before you spend on anything expensive: `rundot generate estimate`.

## Managing generated assets

Generated assets occupy a storage quota, so deleting is a real operation.

- **`rundot assets list`** — `--service <name>` (one service only),
  `--status active|removed` (default `active`), `--limit <n>` (default 20, max
  100), `--game-id <id>`.
- **`rundot assets rm <generation-id>`** — `--service <name>` is **required**
  (`imagegen`, `spritegen`, `audiogen`, or `threedgen`; the id alone doesn't
  identify the partition). Get both the id and the service from
  `rundot assets list`.

Deleting is not undoable from the CLI. Confirm with the creator before removing
anything you didn't just generate.
