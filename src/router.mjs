/**
 * BRAD Dynamic Semantic Router
 *
 * Classifies stakeholder utterances, validates permissions, inspects installed
 * BMAD capabilities and workspace state, and delegates to native workflows
 * without hard-coding case IDs or preselecting routes.
 */

import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const INTENTS = Object.freeze({
  PRD_SPECIFICATION: 'PRD_SPECIFICATION',
  EPIC_STORY_PLANNING: 'EPIC_STORY_PLANNING',
  BUILD_WORK_UNIT: 'BUILD_WORK_UNIT',
  CONTINUE_WORK_UNIT: 'CONTINUE_WORK_UNIT',
  CODE_REVIEW_READONLY: 'CODE_REVIEW_READONLY',
  ACCEPTANCE_TEST_GENERATION: 'ACCEPTANCE_TEST_GENERATION',
  TEST_QUALITY_AUDIT: 'TEST_QUALITY_AUDIT',
  ARCHITECTURE_INVESTIGATION: 'ARCHITECTURE_INVESTIGATION',
  RELEASE_READINESS_AUDIT: 'RELEASE_READINESS_AUDIT',
  UX_DESIGN: 'UX_DESIGN',
  UNAUTHORIZED_DESTRUCTIVE_REQUEST: 'UNAUTHORIZED_DESTRUCTIVE_REQUEST',
  AMBIGUOUS_REQUEST: 'AMBIGUOUS_REQUEST',
  UNKNOWN_INTENT: 'UNKNOWN_INTENT'
});

const SKILL_DIRS = [
  '.agents/skills',
  '.agent/skills',
  '.github/skills',
  '.claude/skills',
  '.codex/skills'
];

/**
 * Discover installed BMAD skill names from well-known host directories.
 */
export function discoverInstalledSkills(projectRoot) {
  const root = resolve(projectRoot || '.');
  const skills = new Set();
  for (const rel of SKILL_DIRS) {
    const dir = join(root, rel);
    if (existsSync(dir)) {
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && existsSync(join(dir, entry.name, 'SKILL.md'))) {
            skills.add(entry.name);
          }
        }
      } catch {
        // Ignore unreadable dirs
      }
    }
  }
  return Array.from(skills).sort();
}

/**
 * Evaluate safety and destructive command constraints under BRAD Contract Rule 8.
 */
function checkUnauthorizedDestructive(text) {
  const lower = text.toLowerCase();
  
  // Destructive git / branch / db operations
  if (
    /delete\s+(all\s+)?branches/i.test(lower) ||
    /force\s+push/i.test(lower) ||
    /push\s+.*(--force|-f)/i.test(lower) ||
    /drop\s+.*(database|table)/i.test(lower) ||
    /rm\s+-rf/i.test(lower) ||
    /bypass\s+ci/i.test(lower) ||
    /auto-merge\s+(to\s+)?(prod|main)\s+without\s+review/i.test(lower) ||
    /skip\s+(ci|checks|protection)/i.test(lower) ||
    /disable\s+(branch\s+)?protection/i.test(lower) ||
    /truncate\s+.*table/i.test(lower) ||
    /git\s+reset\s+--hard/i.test(lower)
  ) {
    return {
      isUnauthorized: true,
      reason: 'BRAD Contract Rule 8: Destructive operations, force pushing, production branch deletion, or bypassing CI/review are strictly prohibited.'
    };
  }

  return { isUnauthorized: false };
}

/**
 * Check if the utterance is too vague or underspecified to act upon.
 */
function checkAmbiguous(text) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Very short non-command words or vague references
  const vaguePatterns = [
    /^do\s+that\s+thing(\s+with\s+the\s+system)?$/i,
    /^update\s+it$/i,
    /^fix\s+it$/i,
    /^run\s+the\s+next\s+one$/i,
    /^fix\s+something$/i,
    /^do\s+something$/i,
    /^test$/i,
    /^build$/i
  ];

  for (const pattern of vaguePatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve a natural language utterance to a BMAD skill, execution mode, and policy.
 */
export function resolveRoute(options = {}) {
  const utterance = (options.utterance || '').trim();
  const projectRoot = options.projectRoot || '.';
  const installed = new Set(options.installedSkills || discoverInstalledSkills(projectRoot));

  if (!utterance) {
    return {
      utterance: '',
      intent: INTENTS.AMBIGUOUS_REQUEST,
      category: 'CLARIFICATION_REQUIRED',
      action: 'CLARIFY',
      selected_route: 'CLARIFICATION_REQUIRED',
      is_authorized: true,
      requires_mutations: false,
      clarification_prompt: 'No request provided. Please specify a ticket ID, task, or desired outcome.'
    };
  }

  // 1. Safety Check (Contract Rule 8)
  const safety = checkUnauthorizedDestructive(utterance);
  if (safety.isUnauthorized) {
    return {
      utterance,
      intent: INTENTS.UNAUTHORIZED_DESTRUCTIVE_REQUEST,
      category: 'POLICY_REFUSAL',
      action: 'REFUSE',
      selected_route: 'REFUSAL_POLICY_DECISION',
      is_authorized: false,
      requires_mutations: false,
      refusal_reason: safety.reason
    };
  }

  // 2. Ambiguity Check (Contract Rule 6)
  if (checkAmbiguous(utterance)) {
    return {
      utterance,
      intent: INTENTS.AMBIGUOUS_REQUEST,
      category: 'CLARIFICATION_REQUIRED',
      action: 'CLARIFY',
      selected_route: 'CLARIFICATION_REQUIRED',
      is_authorized: true,
      requires_mutations: false,
      clarification_prompt: 'Request is ambiguous. Please specify the target ticket ID, story, or specific BMAD workflow needed.'
    };
  }

  const lower = utterance.toLowerCase();

  // 3. Resumption Intent (Contract Rule 1 & 9)
  if (
    /continue\s+(interrupted\s+)?(story|task|work)/i.test(lower) ||
    /resume\s+(work\s+on\s+)?(story|task)?/i.test(lower) ||
    /^\/brad\s+resume/i.test(lower) ||
    /pick\s+up\s+where\s+we\s+left\s+off/i.test(lower)
  ) {
    const route = installed.has('bmad-build') ? 'bmad-build' : 'bmad-help';
    return {
      utterance,
      intent: INTENTS.CONTINUE_WORK_UNIT,
      category: 'EXECUTION',
      action: 'RESUME_WORKFLOW',
      selected_route: route,
      is_resume: true,
      is_authorized: true,
      requires_mutations: true,
      explanation: 'Detected interrupted task resumption. Inspecting git branch and session state before continuing.'
    };
  }

  // 4. Code Review Intent (Read-Only)
  if (
    /review\s+(pull\s+request|pr\s*#?\d+|this\s+code|changes)/i.test(lower) ||
    /code\s+review/i.test(lower) ||
    /audit\s+pr/i.test(lower)
  ) {
    const route = installed.has('bmad-code-review') ? 'bmad-code-review' :
                  installed.has('bmad-review') ? 'bmad-review' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.CODE_REVIEW_READONLY,
        category: 'QUALITY',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-code-review',
        is_authorized: true,
        requires_mutations: false,
        explanation: 'Code review requested, but neither bmad-code-review nor bmad-review is installed.'
      };
    }
    return {
      utterance,
      intent: INTENTS.CODE_REVIEW_READONLY,
      category: 'QUALITY',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: false,
      expected_artifacts: ['_bmad-output/reviews/pr-review.md'],
      explanation: 'Read-only code review requested under Contract Rule 1 (zero mutations without permission).'
    };
  }

  // 5. PRD Intent
  if (
    /\bprd\b/i.test(lower) ||
    /product\s+requirements(\s+document)?/i.test(lower) ||
    /requirements\s+doc/i.test(lower)
  ) {
    const isValidation = /validate\s+.*prd/i.test(lower) || /critique\s+.*prd/i.test(lower);
    const route = installed.has('bmad-prd') ? 'bmad-prd' :
                  installed.has('bmad-create-prd') ? 'bmad-create-prd' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.PRD_SPECIFICATION,
        category: 'PLANNING',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-prd',
        is_authorized: true,
        requires_mutations: !isValidation,
        explanation: 'PRD workflow requested, but bmad-prd is not installed.'
      };
    }
    return {
      utterance,
      intent: INTENTS.PRD_SPECIFICATION,
      category: 'PLANNING',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: !isValidation,
      expected_artifacts: ['_bmad-output/planning-artifacts/prd.md'],
      explanation: `Matched PRD specification intent to installed skill ${route}.`
    };
  }

  // 6. Acceptance / E2E Test Generation Intent
  if (
    /acceptance\s+tests?/i.test(lower) ||
    /e2e\s+tests?/i.test(lower) ||
    /end-to-end\s+tests?/i.test(lower) ||
    /playwright\s+.*tests?/i.test(lower) ||
    /\batdd\b/i.test(lower)
  ) {
    const route = installed.has('bmad-testarch-atdd') ? 'bmad-testarch-atdd' :
                  installed.has('bmad-testarch-automate') ? 'bmad-testarch-automate' :
                  installed.has('bmad-tea') ? 'bmad-tea' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.ACCEPTANCE_TEST_GENERATION,
        category: 'TESTING',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-testarch-atdd',
        is_authorized: true,
        requires_mutations: true,
        explanation: 'Acceptance/E2E test authoring requested, but no installed testarch/TEA skills found.'
      };
    }
    return {
      utterance,
      intent: INTENTS.ACCEPTANCE_TEST_GENERATION,
      category: 'TESTING',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: true,
      explanation: `Matched acceptance test generation to installed skill ${route}.`
    };
  }

  // 7. Test Quality Audit Intent
  if (
    /audit\s+test/i.test(lower) ||
    /test\s+(quality|coverage)\s+(audit|review)/i.test(lower) ||
    /test\s+quality/i.test(lower) ||
    /review\s+.*coverage/i.test(lower) ||
    /critique\s+.*test/i.test(lower)
  ) {
    const route = installed.has('bmad-testarch-test-design') ? 'bmad-testarch-test-design' :
                  installed.has('bmad-testarch-trace') ? 'bmad-testarch-trace' :
                  installed.has('bmad-tea') ? 'bmad-tea' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.TEST_QUALITY_AUDIT,
        category: 'QUALITY',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-testarch-test-design',
        is_authorized: true,
        requires_mutations: false,
        explanation: 'Test quality audit requested, but bmad-testarch-test-design is not installed.'
      };
    }
    return {
      utterance,
      intent: INTENTS.TEST_QUALITY_AUDIT,
      category: 'QUALITY',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: false,
      expected_artifacts: ['_bmad-output/qa/test-review-audit.md'],
      explanation: `Matched test quality audit to installed skill ${route}.`
    };
  }

  // 8. Architecture Intent
  if (
    /architect(ure|ural)?/i.test(lower) ||
    /system\s+design/i.test(lower) ||
    /scaling\s+(concerns?|investigation)/i.test(lower) ||
    /trade-offs?\s+between/i.test(lower)
  ) {
    const route = installed.has('bmad-architecture') ? 'bmad-architecture' :
                  installed.has('bmad-agent-architect') ? 'bmad-agent-architect' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.ARCHITECTURE_INVESTIGATION,
        category: 'ARCHITECTURE',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-architecture',
        is_authorized: true,
        requires_mutations: false,
        explanation: 'Architecture investigation requested, but bmad-architecture is not installed.'
      };
    }
    return {
      utterance,
      intent: INTENTS.ARCHITECTURE_INVESTIGATION,
      category: 'ARCHITECTURE',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: true,
      expected_artifacts: ['_bmad-output/planning-artifacts/architecture.md'],
      explanation: `Matched architecture investigation to installed skill ${route}.`
    };
  }

  // 9. Release Readiness Intent
  if (
    /release\s+readiness/i.test(lower) ||
    /release\s+candidate/i.test(lower) ||
    /release\s+gate/i.test(lower) ||
    /ready\s+for\s+(release|deployment)/i.test(lower) ||
    /retrospective/i.test(lower)
  ) {
    const route = installed.has('bmad-retrospective') ? 'bmad-retrospective' :
                  installed.has('bmad-review') ? 'bmad-review' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.RELEASE_READINESS_AUDIT,
        category: 'RELEASE',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-retrospective',
        is_authorized: true,
        requires_mutations: false,
        explanation: 'Release readiness audit requested, but bmad-retrospective is not installed.'
      };
    }
    return {
      utterance,
      intent: INTENTS.RELEASE_READINESS_AUDIT,
      category: 'RELEASE',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: false,
      expected_artifacts: ['_bmad-output/release/readiness-report.md'],
      explanation: `Matched release readiness audit to installed skill ${route}.`
    };
  }

  // 10. Epic & Story Planning Intent
  if (
    /epic/i.test(lower) ||
    /break\s+down\s+story/i.test(lower) ||
    /refine\s+story/i.test(lower) ||
    /create\s+epics?\s+and\s+stories/i.test(lower) ||
    /backlog\s+refinement/i.test(lower)
  ) {
    const route = installed.has('bmad-create-epics-and-stories') ? 'bmad-create-epics-and-stories' :
                  installed.has('bmad-ticket') ? 'bmad-ticket' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.EPIC_STORY_PLANNING,
        category: 'PLANNING',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-create-epics-and-stories',
        is_authorized: true,
        requires_mutations: true,
        explanation: 'Epic and story planning requested, but bmad-create-epics-and-stories is not installed.'
      };
    }
    return {
      utterance,
      intent: INTENTS.EPIC_STORY_PLANNING,
      category: 'PLANNING',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: true,
      expected_artifacts: ['_bmad-output/planning-artifacts/epics.md'],
      explanation: `Matched epic/story planning intent to installed skill ${route}.`
    };
  }

  // 11. UX Design Intent
  if (/\bux\b/i.test(lower) || /user\s+experience/i.test(lower) || /ui\s+flow/i.test(lower)) {
    const route = installed.has('bmad-ux') ? 'bmad-ux' : null;
    if (!route) {
      return {
        utterance,
        intent: INTENTS.UX_DESIGN,
        category: 'DESIGN',
        action: 'SPECIALIST_UNAVAILABLE',
        selected_route: 'SPECIALIST_UNAVAILABLE',
        missing_skill: 'bmad-ux',
        is_authorized: true,
        requires_mutations: false,
        explanation: 'UX design requested, but bmad-ux is not installed.'
      };
    }
    return {
      utterance,
      intent: INTENTS.UX_DESIGN,
      category: 'DESIGN',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_authorized: true,
      requires_mutations: true,
      explanation: 'Matched UX design intent to installed skill bmad-ux.'
    };
  }

  // 12. Build Work Unit Intent (Ticket Lane / Story Implementation)
  if (
    /build\s+(story|task)?\s*[\d.-]+/i.test(lower) ||
    /implement\s+(story|task)?\s*[\d.-]+/i.test(lower) ||
    /code\s+up\s+story/i.test(lower) ||
    /^\/brad\s+[\d.-]+/i.test(lower) ||
    /develop\s+feature/i.test(lower) ||
    /\bstory\s+\d+[\d.-]*/i.test(lower)
  ) {
    const route = installed.has('bmad-build') ? 'bmad-build' :
                  installed.has('bmad-build-auto') ? 'bmad-build-auto' : 'bmad-help';
    return {
      utterance,
      intent: INTENTS.BUILD_WORK_UNIT,
      category: 'EXECUTION',
      action: 'DELEGATE_WORKFLOW',
      selected_route: route,
      is_resume: false,
      is_authorized: true,
      requires_mutations: true,
      explanation: `Matched build work unit implementation intent to installed skill ${route}.`
    };
  }

  // Fallback: Default to bmad-help status discovery
  return {
    utterance,
    intent: INTENTS.UNKNOWN_INTENT,
    category: 'GENERAL',
    action: 'DELEGATE_WORKFLOW',
    selected_route: installed.has('bmad-help') ? 'bmad-help' : 'NONE',
    is_authorized: true,
    requires_mutations: false,
    explanation: 'Unrecognized intent. Routing to native bmad-help for status and capability overview.'
  };
}

/**
 * Format route result for human-readable CLI or log output.
 */
export function formatRouteExplanation(result) {
  const lines = [
    `Utterance: "${result.utterance}"`,
    `Intent: ${result.intent}`,
    `Action: ${result.action}`,
    `Selected Route: ${result.selected_route}`
  ];
  if (result.refusal_reason) lines.push(`Refusal: ${result.refusal_reason}`);
  if (result.clarification_prompt) lines.push(`Clarification: ${result.clarification_prompt}`);
  if (result.missing_skill) lines.push(`Missing Skill: ${result.missing_skill}`);
  if (result.explanation) lines.push(`Rationale: ${result.explanation}`);
  return lines.join('\n');
}
