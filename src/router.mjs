/** Bounded, deterministic route suggestions. Does not invoke skills or grant consent. */
import { inspectProject } from './discovery.mjs';

export const INTENTS = Object.freeze(Object.fromEntries([
  'PRD_SPECIFICATION', 'EPIC_STORY_PLANNING', 'BUILD_WORK_UNIT', 'CONTINUE_WORK_UNIT',
  'CODE_REVIEW_READONLY', 'ACCEPTANCE_TEST_GENERATION', 'TEST_QUALITY_AUDIT',
  'TEST_DESIGN', 'ARCHITECTURE_INVESTIGATION', 'RELEASE_READINESS_AUDIT',
  'UX_DESIGN', 'EXPLICIT_WORKFLOW', 'UNAUTHORIZED_DESTRUCTIVE_REQUEST',
  'AMBIGUOUS_REQUEST', 'UNKNOWN_INTENT'
].map(name => [name, name])));

export function discoverInstalledSkills(projectRoot) {
  return inspectProject(projectRoot).nativeSkills;
}

// A conservative preflight filter, not a security boundary for an executing host.
const destructivePatterns = [
  /\bforce[ -]?push(?:ing)?\b/i, /\bpush\b.*(?:--force|\s-f\b)/i,
  /\bdelete\s+(?:all\s+)?branches\b/i, /\bdrop\b.*(?:database|tables?)\b/i,
  /\brm\s+-rf\b/i, /\bbypass\s+ci\b/i, /\bskip\s+(?:ci|checks|protection)\b/i,
  /\bdisable\s+(?:branch\s+)?protection\b/i, /\btruncate\b.*table\b/i,
  /\bgit\s+reset\s+--hard\b/i, /\bauto-merge\b/i
];
function destructiveRequest(text) {
  return text.split(/(?:[.;\n]|\b(?:and then|then|and)\b)/i).some(clause => {
    if (!destructivePatterns.some(pattern => pattern.test(clause))) return false;
    return !/^\s*(?:explain|discuss|describe|review|audit|why\b|what\b|how\b|do not\b|don't\b|never\b|avoid\b)/i.test(clause);
  });
}

export function resolveRoute(options = {}) {
  if (options.utterance != null && typeof options.utterance !== 'string') throw new TypeError('utterance must be a string');
  const utterance = (options.utterance || '').trim();
  const text = utterance.replace(/^\/brad\s*/i, '');
  const inventory = options.installedSkills === undefined ? inspectProject(options.projectRoot) : null;
  if (options.installedSkills !== undefined && (!Array.isArray(options.installedSkills) ||
    !options.installedSkills.every(name => typeof name === 'string'))) throw new TypeError('installedSkills must be an array of names');
  const installed = new Set(options.installedSkills ?? inventory.nativeSkills);
  const inspection = /^(?:please\s+)?(?:review|audit|inspect|investigate|explain|assess|evaluate|critique)\b/i.test(text);
  const planOnly = options.dryRun || /^(?:please\s+)?plan\b|--plan\b|\bdry[ -]run\b|\bplan[ -]only\b/i.test(text);
  const readOnly = planOnly || inspection || /\bread[ -]only\b|\b(?:review|audit)\s+only\b|\b(?:without|no)\s+(?:any\s+)?(?:changes|mutations)|\bwithout\s+changing\b|\b(?:do not|don't)\s+(?:change|modify|write)\b/i.test(text);
  const noCode = /\bno\s+code\b|\bwithout\s+(?:changing|writing)\s+(?:any\s+)?code\b/i.test(text);
  const base = { utterance, is_authorized: true, requires_mutations: false, mutation_scope: 'NONE',
    execution: 'NOT_RUN', authorization: 'REQUIRES_HOST_CHECK',
    ...(inventory ? { version_hint_not_proof: inventory.version_hint_not_proof, discovery_warnings: inventory.warnings } : {}) };
  const clarify = prompt => ({ ...base, intent: INTENTS.AMBIGUOUS_REQUEST, category: 'CLARIFICATION_REQUIRED',
    action: 'CLARIFY', selected_route: 'CLARIFICATION_REQUIRED', clarification_prompt: prompt });
  if (!utterance) return clarify('Specify a ticket ID, task, or desired outcome.');
  if (destructiveRequest(text)) return { ...base, intent: INTENTS.UNAUTHORIZED_DESTRUCTIVE_REQUEST,
    category: 'POLICY_REFUSAL', action: 'REFUSE', selected_route: 'REFUSAL_POLICY_DECISION', is_authorized: false,
    refusal_reason: 'BRAD Contract Rule 8: Destructive operations require separate authorization and host policy checks.' };

  function suggest(intent, category, candidates, scope = 'NONE', extra = {}) {
    const selected = candidates.find(name => installed.has(name));
    if (!selected) return { ...base, intent, category, ...extra, action: 'SPECIALIST_UNAVAILABLE',
      selected_route: 'SPECIALIST_UNAVAILABLE', missing_skill: candidates[0],
      explanation: `No installed workflow for this objective. Required: ${candidates.join(' or ')}.` };
    if (inventory?.conflicts.includes(selected) || inventory?.warnings.length) return clarify(`Inspect the conflicting or unreadable installation of ${selected} before selecting a workflow.`);
    const effectiveScope = readOnly ? 'NONE' : noCode && scope === 'CODE_AND_DOCUMENTS' ? 'NONE' : scope;
    if (effectiveScope !== 'NONE' && inventory?.stateHints.mixed) return clarify('Both v6 and v7 hints exist. Resolve the native runtime owning this task before writes.');
    return { ...base, intent, category, ...extra, action: 'DELEGATE_WORKFLOW', selected_route: selected,
      requires_mutations: effectiveScope !== 'NONE', mutation_scope: effectiveScope,
      explanation: `Suggested installed workflow ${selected}. The host must inspect its instructions, resolve the target and enforce consent before invocation.` };
  }

  const explicit = [...text.matchAll(/(?:^\/|\b(?:use|invoke|run|via)\s+)(bmad(?:-[a-z0-9-]+)?)\b/gi)].map(m => m[1].toLowerCase());
  if (new Set(explicit).size > 1) return clarify('Choose one explicit workflow or describe the order and stopping point.');
  if (explicit.length) {
    // Explicit workflows have contracts beyond this preflight classifier.
    const result = suggest(INTENTS.EXPLICIT_WORKFLOW, 'GENERAL', [explicit[0]], 'NONE', { workflow_contract_required: true });
    return result.action === 'DELEGATE_WORKFLOW' ? { ...result, action: 'INSPECT_WORKFLOW' } : result;
  }
  if (/^(?:do\s+that\s+thing(?:\s+with\s+the\s+system)?|update\s+it|fix\s+it|run\s+the\s+next\s+one|fix\s+something|do\s+something|test|build)[.!]?$/i.test(text)) {
    return clarify('Specify the target ticket, story, or desired workflow.');
  }
  if (/\b(?:explain|discuss|describe)\b/i.test(text) && /\b(?:force[ -]?push(?:ing)?|rm\s+-rf|drop\b.*(?:database|table)|git\s+reset)\b/i.test(text)) {
    return { ...base, intent: INTENTS.UNKNOWN_INTENT, category: 'GENERAL', action: 'READ_ONLY_DISCUSSION', selected_route: 'NONE' };
  }

  const review = /\b(?:review|audit|critique|evaluate|assess|inspect)\b/i.test(text);
  const target = text.match(/\b(?:story|task|ticket)\s+([a-z0-9]+(?:[.-][a-z0-9]+)+)\b/i)?.[1] ??
    text.match(/^(?:--plan\s+)?(\d+(?:[.-]\d+)+)\b/)?.[1];
  const nativeTarget = { target_candidate: target ?? null, target_resolution: 'REQUIRES_NATIVE_RESOLUTION' };
  const build = () => suggest(INTENTS.BUILD_WORK_UNIT, 'EXECUTION', ['bmad-build'], 'CODE_AND_DOCUMENTS', { ...nativeTarget, is_resume: false });
  if (/^(?:please\s+)?(?:review|audit)\s+(?:pr\s*#?\d+|pull\s+request|story\s+\d)/i.test(text)) {
    return suggest(INTENTS.CODE_REVIEW_READONLY, 'QUALITY', ['bmad-code-review'], 'NONE', nativeTarget);
  }
  if (target && /^(?:please\s+)?(?:build|implement|develop|code\s+up)\b/i.test(text)) return build();
  if (/\b(?:resume|continue\s+(?:interrupted\s+)?(?:story|task|work|where)|pick\s+up\s+where)\b/i.test(text)) {
    if (inspection) return clarify('Inspect the existing native continuation plan without running Build.');
    return suggest(INTENTS.CONTINUE_WORK_UNIT, 'EXECUTION', ['bmad-build'], 'CODE_AND_DOCUMENTS', { ...nativeTarget, is_resume: true });
  }
  if (/\b(?:prd|product\s+requirements(?:\s+document)?|requirements\s+doc)\b/i.test(text)) {
    if (/\bapprov(?:e|al)\b/i.test(text)) return clarify('PRD approval belongs to the authorized human owner. Specify validation or refinement if that is the intended task.');
    const validate = review || /\bvalidat(?:e|ion)\b/i.test(text);
    const edit = /\b(?:edit|refine|improve|update|extend|amend)\b/i.test(text);
    return suggest(INTENTS.PRD_SPECIFICATION, 'PLANNING', validate ? ['bmad-prd', 'bmad-validate-prd'] :
      edit ? ['bmad-prd', 'bmad-edit-prd'] : ['bmad-prd', 'bmad-create-prd'], validate ? 'NONE' : 'DOCUMENTS_ONLY',
    { operation: validate ? 'VALIDATE' : edit ? 'REFINE' : 'CREATE' });
  }
  if ((review && /\b(?:tests?|coverage|assertion)\b/i.test(text)) || /\btest\s+quality\b/i.test(text)) {
    return suggest(INTENTS.TEST_QUALITY_AUDIT, 'QUALITY', ['bmad-testarch-test-review']);
  }
  if (/\b(?:test[ -]design|plan\s+(?:the\s+)?(?:tests?|qa)|risk\s+matrix)\b/i.test(text)) {
    return suggest(INTENTS.TEST_DESIGN, 'TESTING', ['bmad-testarch-test-design'], 'DOCUMENTS_ONLY');
  }
  if (/\b(?:acceptance\s+tests?|atdd)\b/i.test(text)) {
    return suggest(INTENTS.ACCEPTANCE_TEST_GENERATION, 'TESTING', ['bmad-testarch-atdd'], 'TESTS_ONLY');
  }
  if (/\b(?:e2e|end-to-end|playwright)\b/i.test(text) && /\btests?\b/i.test(text)) {
    return suggest(INTENTS.ACCEPTANCE_TEST_GENERATION, 'TESTING', ['bmad-qa-generate-e2e-tests', 'bmad-testarch-automate'], 'TESTS_ONLY');
  }
  if (/\b(?:expand|improve|automate)\b.*\b(?:coverage|tests?)\b|\bautomated\s+coverage\b/i.test(text)) {
    return suggest(INTENTS.ACCEPTANCE_TEST_GENERATION, 'TESTING', ['bmad-testarch-automate'], 'TESTS_ONLY');
  }
  if (review && /\b(?:pr\s*#?\d+|pull\s+request|code|changes|story\s+\d|diff|branch)\b/i.test(text)) {
    return suggest(INTENTS.CODE_REVIEW_READONLY, 'QUALITY', ['bmad-code-review'], 'NONE', nativeTarget);
  }
  if (/^(?:please\s+)?(?:refine|break\s+down|create)\s+(?:epics?|stories|story|backlog)\b/i.test(text)) {
    return suggest(INTENTS.EPIC_STORY_PLANNING, 'PLANNING', ['bmad-create-epics-and-stories', 'bmad-ticket'], 'DOCUMENTS_ONLY', nativeTarget);
  }
  if (/\barchitect(?:ure|ural)?\b|\bsystem\s+design\b|\bscaling\s+(?:concerns?|investigation)\b|\btrade-offs?\s+between\b/i.test(text)) {
    const investigation = review || /\b(?:investigate|explain)\b/i.test(text);
    return suggest(INTENTS.ARCHITECTURE_INVESTIGATION, 'ARCHITECTURE', ['bmad-architecture', 'bmad-agent-architect'], investigation ? 'NONE' : 'DOCUMENTS_ONLY');
  }
  if (/\brelease\b.*\b(?:readiness|ready|candidate|gate)\b|\bready\s+for\s+(?:release|deployment)\b/i.test(text)) {
    return suggest(INTENTS.RELEASE_READINESS_AUDIT, 'RELEASE', ['bmad-testarch-nfr'], 'NONE',
      { assessment_scope: 'NFR_ONLY', release_verdict: 'UNVERIFIED' });
  }
  if (/\bretrospective\b/i.test(text)) return suggest(INTENTS.EXPLICIT_WORKFLOW, 'QUALITY', ['bmad-retrospective'], 'DOCUMENTS_ONLY');
  if (/\b(?:epics?|backlog\s+refinement)\b|\b(?:break\s+down|refine)\s+(?:story\s+)?\d/i.test(text)) {
    return suggest(INTENTS.EPIC_STORY_PLANNING, 'PLANNING', ['bmad-create-epics-and-stories', 'bmad-ticket'], review ? 'NONE' : 'DOCUMENTS_ONLY', nativeTarget);
  }
  if (/\bux\b|\buser\s+experience\b|\bui\s+flow\b/i.test(text)) {
    return suggest(INTENTS.UX_DESIGN, 'DESIGN', ['bmad-ux'], review ? 'NONE' : 'DOCUMENTS_ONLY');
  }
  if (/\btest\s+(?:story|task|ticket)\b/i.test(text)) return clarify('Inspect the native story and existing tests. Specify running tests, test design, test review, or generating tests.');
  if (/\b(?:status|show|explain)\b/i.test(text)) return suggest(INTENTS.UNKNOWN_INTENT, 'GENERAL', ['bmad-help', 'bmad']);
  if (/\b(?:build|implement|develop|code\s+up)\b/i.test(text) || /^\d+(?:[.-]\d+)+\b/.test(text) || /^--plan\s+\d/.test(text)) {
    return build();
  }
  return clarify('This bounded preflight cannot resolve the request. Use the host to inspect project context and the installed native workflow.');
}

export function formatRouteExplanation(result) {
  const lines = [`Utterance: "${result.utterance}"`, `Intent: ${result.intent}`,
    `Action: ${result.action}`, `Selected Route: ${result.selected_route}`, 'Execution: NOT_RUN (suggestion only)'];
  for (const [field, label] of [['refusal_reason', 'Refusal'], ['clarification_prompt', 'Clarification'],
    ['missing_skill', 'Missing Skill'], ['explanation', 'Rationale']]) if (result[field]) lines.push(`${label}: ${result[field]}`);
  return lines.join('\n');
}
