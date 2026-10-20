import { appendFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.argv[2];
const raw = process.argv[3];
if (!runId || !raw) throw new Error('Usage: node evaluation-tools/record-event.mjs <run-id> <JSON event>');
const runRoot = resolve(labRoot, 'evaluations/brad-v0.4.1', runId);
const event = JSON.parse(raw);
if (!event.eventId || event.runId !== runId || !event.eventType || !event.summary || !Array.isArray(event.evidenceIds)) {
  throw new Error('Event must include eventId, matching runId, eventType, summary, and evidenceIds.');
}
const index = JSON.parse(await readFile(join(runRoot, 'evidence/evidence-index.json'), 'utf8'));
const evidenceIds = new Set(index.records.map(record => record.id));
for (const id of event.evidenceIds) if (!evidenceIds.has(id)) throw new Error(`Unknown evidence ID: ${id}`);
const path = join(runRoot, 'telemetry/events.jsonl');
const lines = (await readFile(path, 'utf8')).trim().split(/\r?\n/);
for (const line of lines) if (JSON.parse(line).eventId === event.eventId) throw new Error(`Duplicate event ID: ${event.eventId}`);
event.timestamp ??= new Date().toISOString();
event.timestampMeaning ??= 'captured_at';
event.occurredAt ??= null;
event.tokenUsage ??= null;
await appendFile(path, `${JSON.stringify(event)}\n`, 'utf8');
console.log(`Appended ${event.eventId} to ${runId}.`);
