import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { statuses } from '../../src/api'

// Protocol fixtures are test-only; the production client always requests /api.
const roster = [
  { id: 'pm-01', name: 'Morgan Park', role: 'product-manager' },
  { id: 'ba-01', name: 'Blair Adams', role: 'business-analyst' },
  { id: 'dm-01', name: 'Dana Miller', role: 'delivery-manager' },
  { id: 'arch-01', name: 'Alex Chen', role: 'solution-architect' },
  { id: 'tl-01', name: 'Taylor Lee', role: 'technical-lead' },
  { id: 'dev-01', name: 'Jamie Reed', role: 'developer' },
  { id: 'dev-02', name: 'Riley Singh', role: 'developer' },
  { id: 'dev-03', name: 'Casey Brown', role: 'developer' },
  { id: 'qa-01', name: 'Sam Patel', role: 'functional-qa' },
  { id: 'qa-02', name: 'Robin Jones', role: 'automation-qa' },
]
async function service(page: Page, options: { empty?: boolean; conflict?: boolean; forbidden?: boolean; broken?: boolean } = {}) {
  let current: typeof roster[number] | undefined
  let conflict = options.conflict
  const calls: { path: string; method: string; body: Record<string, unknown> }[] = []
  const projects = options.empty ? [] : [{ id: 'p-1', name: 'Customer experience', description: 'A simpler path from first visit to lasting value.', status: 'Active' }]
  let items = options.empty ? [] : statuses.map((status, index) => ({
    id: `work-${index}`, projectId: 'p-1', type: index === 0 ? 'initiative' : index === 1 ? 'task' : 'story',
    title: index === 0 ? 'Improve customer onboarding' : `${status} delivery item`,
    description: 'Make the next step clear to the customer.', acceptanceCriteria: ['The next action has a visible label.', 'Keyboard users can complete the journey.'],
    priority: 'medium', estimate: 3, assigneeId: 'dev-01', dependencies: [] as string[], status, version: 1, updatedAt: '2026-10-19T15:00:00Z',
  }))
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api', '')
    const method = request.method()
    const body = request.postDataJSON() ?? {}
    calls.push({ path, method, body })
    const success = (data: unknown) => route.fulfill({ json: { data } })
    const failure = (status: number, code: string, message: string) => route.fulfill({ status, json: { error: { code, message } } })
    if ((path.endsWith('/work-items') && method === 'POST') || (path.startsWith('/work-items/') && method === 'PATCH')) {
      const planningFields = ['title', 'description', 'acceptanceCriteria', 'priority', 'estimate', 'assigneeId', 'dependencies']
      const allowed = method === 'POST' ? ['type', ...planningFields] : ['expectedVersion', ...planningFields]
      if (Object.keys(body).some(key => !allowed.includes(key))) return failure(400, 'INVALID_INPUT', 'Unknown fields.')
      if (method === 'POST' && !['initiative', 'story', 'task'].includes(body.type)) return failure(400, 'INVALID_INPUT', 'Unsupported type.')
      if (body.priority !== undefined && !['urgent', 'high', 'medium', 'low'].includes(body.priority)) return failure(400, 'INVALID_INPUT', 'Unsupported priority.')
      if (body.estimate !== undefined && body.estimate !== null && (typeof body.estimate !== 'number' || body.estimate < 0 || body.estimate > 10000)) return failure(400, 'INVALID_INPUT', 'Unsupported estimate.')
    }
    if (options.broken && path === '/session') return failure(503, 'UNAVAILABLE', 'The service is offline.')
    if (path === '/demo-users') return success(roster)
    if (path === '/session') return current ? success(current) : failure(401, 'UNAUTHENTICATED', 'Sign in first.')
    if (path === '/session/demo') { current = roster.find(user => user.id === body.userId); return success(current) }
    if (path === '/session/logout') { current = undefined; return success(null) }
    if (path === '/users') return success(roster)
    if (path === '/projects' && method === 'GET') return success(projects)
    if (path === '/projects' && method === 'POST') {
      const created = { id: 'p-2', ...body, status: 'Active' }
      projects.push(created); return success(created)
    }
    if (path.endsWith('/activity')) return success([])
    if (path.endsWith('/release-readiness')) return success({ ready: false, blockers: ['QA verification required'] })
    if (path.endsWith('/work-items') && method === 'GET') return success(items)
    if (path.endsWith('/work-items') && method === 'POST') {
      const created = { ...body, id: 'created-story', projectId: 'p-1', status: 'Draft', version: 1, updatedAt: new Date().toISOString() }
      items.push(created); return success(created)
    }
    const id = path.split('/')[2]
    const found = items.find(item => item.id === id)
    if (found && path.endsWith('/transitions')) {
      if (options.forbidden) return failure(403, 'FORBIDDEN', 'Your role cannot perform this transition.')
      found.status = body.to; found.version++; return success(found)
    }
    if (found && method === 'PATCH') {
      if (conflict) { conflict = false; found.version++; return failure(409, 'VERSION_CONFLICT', 'Another teammate saved version 2.') }
      Object.assign(found, body, { version: found.version + 1 }); return success(found)
    }
    return failure(404, 'NOT_FOUND', 'No fixture for this endpoint.')
  })
  return { calls, get items() { return items } }
}
async function signIn(page: Page, name = 'Morgan Park') {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await expect(page.getByRole('heading', { name: 'A clear view of what’s next.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Customer experience', exact: true })).toBeVisible()
}
test('demo identity, navigation, filters, every board state, and responsive layout', async ({ page }, testInfo) => {
  const fixture = await service(page)
  await page.goto('/')
  await expect(page.getByText('Development-only demo', { exact: true })).toBeVisible()
  await expect(page.locator('.accounts button')).toHaveCount(10)
  await page.getByRole('button', { name: /Morgan Park/ }).click()
  await expect(page.getByRole('heading', { name: 'Customer experience', exact: true })).toBeVisible()
  expect(fixture.calls.find(call => call.path === '/session/demo')?.body).toEqual({ userId: 'pm-01' })
  await page.screenshot({ path: testInfo.outputPath('overview.png'), fullPage: true })
  await page.getByRole('button', { name: 'Backlog', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Initiatives' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search work items' }).fill('onboarding')
  await expect(page.locator('.item-row')).toHaveCount(1)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('Blocked')
  await expect(page.locator('.item-row')).toHaveCount(1)
  await page.getByRole('searchbox', { name: 'Search work items' }).fill('No matching work')
  await expect(page.getByRole('heading', { name: 'Nothing matches this view' })).toBeVisible()
  await page.getByRole('button', { name: 'Delivery board', exact: true }).click()
  await expect(page.locator('.work-card')).toHaveCount(12)
  for (const status of statuses) await expect(page.locator('.work-card .badge', { hasText: new RegExp(`^${status}$`) })).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('board.png'), fullPage: true })
})
test('creates a story with criteria, assignment, and dependencies', async ({ page }) => {
  const fixture = await service(page)
  await signIn(page)
  await page.getByRole('button', { name: 'New work item' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Work item type').locator('option')).toHaveText(['initiative', 'story', 'task'])
  expect(await dialog.getByLabel('Priority').locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(['urgent', 'high', 'medium', 'low'])
  await expect(dialog.getByLabel('Work item type')).toHaveValue('story')
  await expect(dialog.getByLabel('Priority')).toHaveValue('medium')
  await dialog.getByLabel('Title', { exact: true }).fill('Keyboard-first checkout')
  await dialog.getByLabel('Acceptance criteria').fill('Tab reaches the payment action.\nErrors have readable labels.')
  await dialog.getByLabel('Assignee').selectOption('dev-02')
  await dialog.getByRole('checkbox', { name: 'Improve customer onboarding' }).check()
  await dialog.getByRole('button', { name: 'Create work item' }).click()
  await expect(page.getByRole('heading', { name: 'Keyboard-first checkout' })).toBeVisible()
  const mutation = fixture.calls.find(call => call.path.endsWith('/work-items') && call.method === 'POST')
  expect(mutation?.body).toEqual({
    type: 'story', title: 'Keyboard-first checkout', description: '',
    acceptanceCriteria: ['Tab reaches the payment action.', 'Errors have readable labels.'],
    priority: 'medium', estimate: null, assigneeId: 'dev-02', dependencies: ['work-0'],
  })
})
test('conflicting edits retain draft and refresh optimistic version', async ({ page }) => {
  const fixture = await service(page, { conflict: true })
  await signIn(page)
  await page.getByRole('button', { name: 'Backlog', exact: true }).click()
  await page.locator('.item-row').first().click()
  await page.getByRole('button', { name: 'Edit details & assignment' }).click()
  await expect(page.getByLabel('Work item type')).toBeDisabled()
  await page.getByLabel('Estimate').fill('')
  await page.getByLabel('Title', { exact: true }).fill('Retained draft')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('alert')).toContainText('This item changed in another session.')
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Retained draft')
  await page.getByRole('alert').getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByText('Version 2 · checked on save')).toBeVisible()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Retained draft')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'Retained draft' })).toBeVisible()
  expect(fixture.calls.filter(call => call.method === 'PATCH').map(call => call.body.expectedVersion)).toEqual([1, 2])
  const patches = fixture.calls.filter(call => call.method === 'PATCH')
  expect(patches[1].body).toEqual({
    title: 'Retained draft', description: 'Make the next step clear to the customer.',
    acceptanceCriteria: ['The next action has a visible label.', 'Keyboard users can complete the journey.'],
    priority: 'medium', estimate: null, assigneeId: 'dev-01', dependencies: [], expectedVersion: 2,
  })
  expect(fixture.items[0].estimate).toBeNull()
})
test('developer sees own work, role-aware actions, and server rejection', async ({ page }) => {
  await service(page, { forbidden: true })
  await signIn(page, 'Jamie Reed')
  await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'New work item' })).toHaveCount(0)
  await page.getByRole('button', { name: /My work/ }).click()
  await expect(page.locator('.item-row')).toHaveCount(12)
  await page.locator('.item-row').first().click()
  await expect(page.getByRole('button', { name: 'Edit details & assignment' })).toHaveCount(0)
  await expect(page.getByLabel('Next status').locator('option')).toHaveText(['Choose a status', 'Blocked'])
  await page.getByLabel('Next status').selectOption('Blocked')
  await page.getByRole('button', { name: 'Update status' }).click()
  await expect(page.getByRole('alert')).toContainText('This action is not permitted.')
  await expect(page.getByRole('dialog').locator('.detail-meta')).toContainText('Draft')
})
test('empty project creation, item creation entry, sign-out, and unavailable API', async ({ page }) => {
  await service(page, { empty: true })
  await page.goto('/')
  await page.getByRole('button', { name: /Morgan Park/ }).click()
  await expect(page.getByRole('heading', { name: 'Make room for your next project' })).toBeVisible()
  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByLabel('Project name').fill('New project')
  await page.getByLabel('Description', { exact: true }).fill('A shared goal.')
  await page.getByRole('button', { name: 'Create project', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New project', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out / switch account' }).click()
  await expect(page.getByRole('heading', { name: 'Choose your seat.' })).toBeVisible()
  await page.unrouteAll()
  await service(page, { broken: true })
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('The service is offline.')
  await expect(page.getByRole('alert').getByRole('button', { name: 'Retry' })).toBeVisible()
})
test('keyboard modal containment, Escape dismissal, focus return, and review queue', async ({ page }) => {
  await service(page)
  await signIn(page)
  await page.getByRole('button', { name: 'Reviews & QA', exact: true }).click()
  await expect(page.locator('.item-row')).toHaveCount(5)
  const row = page.locator('.item-row').first()
  await row.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  for (let index = 0; index < 12; index++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row).toBeFocused()
})
test('sign-in, overview, board, and story form pass automated WCAG AA checks', async ({ page }) => {
  await service(page)
  await page.goto('/')
  const violations = async () => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations
  expect(await violations()).toEqual([])
  await page.getByRole('button', { name: /Morgan Park/ }).click()
  await expect(page.getByRole('heading', { name: 'Customer experience', exact: true })).toBeVisible()
  expect(await violations()).toEqual([])
  await page.getByRole('button', { name: 'Delivery board', exact: true }).click()
  await expect(page.locator('.work-card')).toHaveCount(12)
  expect(await violations()).toEqual([])
  await page.getByRole('button', { name: 'New work item' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await violations()).toEqual([])
})
test('status changes submit the current version and display the server result', async ({ page }) => {
  const fixture = await service(page)
  await signIn(page, 'Jamie Reed')
  await page.getByRole('button', { name: 'Backlog', exact: true }).click()
  await page.locator('.item-row').filter({ hasText: 'Ready delivery item' }).click()
  await page.getByLabel('Next status').selectOption('In Development')
  await page.getByRole('button', { name: 'Update status' }).click()
  await expect(page.getByRole('dialog').locator('.detail-meta')).toContainText('In Development')
  expect(fixture.calls.find(call => call.path.endsWith('/transitions'))?.body).toEqual({ to: 'In Development', expectedVersion: 1 })
})
test('loading remains visible until work item requests finish', async ({ page }) => {
  const fixture = await service(page)
  let release: () => void = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/projects/p-1/work-items', async route => {
    await pending
    await route.fulfill({ json: { data: fixture.items } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Morgan Park/ }).click()
  await expect(page.getByText('Loading the latest workspace data…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Customer experience', exact: true })).toHaveCount(0)
  release()
  await expect(page.getByRole('heading', { name: 'Customer experience', exact: true })).toBeVisible()
})
