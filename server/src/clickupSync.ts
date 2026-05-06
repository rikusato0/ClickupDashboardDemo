import { clickupRequest } from './clickupApi.js'
import {
  loadConfig,
  parseClientContactEmailsMap,
  parseClientDomainMap,
} from './config.js'
import { TASK_TYPES } from './dashboardTypes.js'
import {
  ClickUpTaskModel,
  ClientModel,
  StaffModel,
  SyncStateModel,
  TimeEntryModel,
} from './models.js'

const TASK_TYPE_NAMES = new Set<string>(TASK_TYPES)

type CuUser = { id: number; username?: string; email?: string }

type CuTeamResp = {
  team?: {
    members?: { user: CuUser }[]
  }
}

type CuSpacesResp = { spaces?: { id: string; name: string }[] }

type CuFoldersResp = { folders?: { id: string; name: string }[] }

type CuListsResp = { lists?: { id: string; name: string }[] }

type CuTag = { name?: string }

type CuStatus = {
  status?: string
  type?: string
}

type CuAssignee = { id?: number | string }

type CuTask = {
  id: string
  name?: string
  status?: CuStatus
  assignees?: CuAssignee[]
  tags?: CuTag[]
  priority?: { priority?: string } | string
  due_date?: string | null
  start_date?: string | null
  date_updated?: string | null
  list?: { id?: string; name?: string }
  folder?: { id?: string; name?: string }
  space?: { id?: string }
  url?: string
}

type CuTimeTask = {
  id: string
  name?: string
  space?: { id?: string }
  folder?: { id?: string }
  list?: { id?: string }
  tags?: CuTag[]
}

type CuTimeEntry = {
  id: string
  duration: string
  start: string
  end?: string
  user: { id: string; username?: string; email?: string }
  task: CuTimeTask
  description?: string
}

type CuTimeEntriesResp = {
  data?: CuTimeEntry[]
}

type CuTaskPageResp = {
  tasks?: CuTask[]
  last_page?: boolean
}

function initialsFromName(name: string): string {
  const p = name.split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return `${p[0]![0]!}${p[1]![0]!}`.toUpperCase()
}

function priorityLabel(p: CuTask['priority']): string {
  if (!p) return ''
  if (typeof p === 'string') return p
  return p.priority ?? ''
}

function pickTaskTypeFromTags(tags: CuTag[] | undefined): string | null {
  for (const t of tags ?? []) {
    const n = t.name?.trim()
    if (n && TASK_TYPE_NAMES.has(n)) return n
  }
  return null
}

/** Tag match wins; otherwise bucket hours under Recurring but preserve list name on rows. */
function resolvedTaskTypeFromTagsAndList(
  tags: CuTag[] | undefined,
  _listName: string,
): string {
  return pickTaskTypeFromTags(tags) ?? 'Recurring'
}

function clientIdFromTask(task: CuTimeTask): string {
  const fid = task.folder?.id
  if (fid) return `f-${fid}`
  const sid = task.space?.id
  return sid ? `s-${sid}` : 'unassigned'
}

function taskIsNonClosed(task: CuTask): boolean {
  const t = task.status?.type?.toLowerCase()
  if (t === 'closed') return false
  const st = task.status?.status?.toLowerCase() ?? ''
  if (st === 'complete' || st === 'completed') return false
  return true
}

async function mergedContactEmails(
  cid: string,
  fromEnv: string[],
): Promise<string[]> {
  const prev = await ClientModel.findOne({ id: cid }).select('contactEmails').lean()
  const prevArr = (prev?.contactEmails ?? []) as string[]
  return [...new Set([...fromEnv.map((e) => e.toLowerCase()), ...prevArr.map((e) => String(e).toLowerCase())])]
}

async function fetchAllTasksForList(
  token: string,
  listId: string,
): Promise<CuTask[]> {
  const acc: CuTask[] = []
  let page = 0
  for (;;) {
    const qs = new URLSearchParams({
      page: String(page),
      include_closed: 'true',
      subtasks: 'false',
    })
    const path = `/list/${encodeURIComponent(listId)}/task?${qs}`
    const data = await clickupRequest<CuTaskPageResp>(token, path)
    const batch = data.tasks ?? []
    acc.push(...batch)
    if (batch.length === 0 || data.last_page === true) break
    page += 1
    if (page > 500) break
  }
  return acc
}

export async function syncClickUpTasks(
  token: string,
): Promise<{ upserted: number; clients: number }> {
  const clients = await ClientModel.find({
    clickUpListIds: { $exists: true, $not: { $size: 0 } },
  }).lean()

  let upserted = 0
  for (const c of clients) {
    const clientId = c.id
    const listIds = (c.clickUpListIds ?? []) as string[]
    let openCount = 0

    for (const listId of listIds) {
      const tasks = await fetchAllTasksForList(token, listId)
      for (const task of tasks) {
        const lid = String(task.list?.id ?? listId)
        const listName = task.list?.name ?? ''
        const tagNames = (task.tags ?? []).map((x) => x.name?.trim()).filter(Boolean) as string[]
        const resolvedTaskType = resolvedTaskTypeFromTagsAndList(task.tags, listName)
        const assigneeIds = (task.assignees ?? []).map((a) => String(a.id ?? '')).filter(Boolean)

        if (taskIsNonClosed(task)) openCount += 1

        await ClickUpTaskModel.findOneAndUpdate(
          { id: task.id },
          {
            id: task.id,
            clientId,
            clickUpListId: lid,
            listName,
            clickUpSpaceId: String(task.space?.id ?? c.clickUpSpaceId ?? ''),
            clickUpFolderId: String(task.folder?.id ?? c.clickUpFolderId ?? ''),
            name: task.name ?? '',
            status: task.status?.status ?? '',
            statusType: task.status?.type ?? '',
            priority: priorityLabel(task.priority),
            assigneeIds,
            tagNames,
            resolvedTaskType,
            dueDate: task.due_date ? String(task.due_date) : '',
            startDate: task.start_date ? String(task.start_date) : '',
            url: task.url ?? '',
            dateUpdatedMs: task.date_updated ? String(task.date_updated) : '',
          },
          { upsert: true },
        )
        upserted += 1
      }
    }

    await ClientModel.updateOne({ id: clientId }, { openTaskCount: openCount })
  }

  return { upserted, clients: clients.length }
}

export async function syncClickUpStructures(
  token: string,
  teamId: string,
): Promise<void> {
  const cfg = loadConfig()
  const domainMap = parseClientDomainMap(cfg.CLIENT_EMAIL_DOMAINS_JSON)
  const contactEmailsMap = parseClientContactEmailsMap(cfg.CLIENT_CONTACT_EMAILS_JSON)

  const teamData = await clickupRequest<CuTeamResp>(
    token,
    `/team/${encodeURIComponent(teamId)}`,
  )
  const members = teamData.team?.members ?? []
  for (const m of members) {
    const u = m.user
    const id = String(u.id)
    const name =
      u.username ||
      u.email ||
      `User ${id}`
    await StaffModel.findOneAndUpdate(
      { id },
      {
        id,
        name,
        initials: initialsFromName(name),
        email: u.email ?? '',
      },
      { upsert: true },
    )
  }

  const { spaces = [] } = await clickupRequest<CuSpacesResp>(
    token,
    `/team/${encodeURIComponent(teamId)}/space?archived=false`,
  )

  for (const sp of spaces) {
    const { folders = [] } = await clickupRequest<CuFoldersResp>(
      token,
      `/space/${encodeURIComponent(sp.id)}/folder?archived=false`,
    )

    if (folders.length === 0) {
      const cid = `s-${sp.id}`
      const extraDomains = domainMap.get(cid) ?? []
      const listsResp = await clickupRequest<CuListsResp>(
        token,
        `/space/${encodeURIComponent(sp.id)}/list?archived=false`,
      )
      const lists = listsResp.lists ?? []
      const listIds = lists.map((l) => l.id)
      const mergedEmails = await mergedContactEmails(cid, contactEmailsMap.get(cid) ?? [])

      await ClientModel.findOneAndUpdate(
        { id: cid },
        {
          id: cid,
          name: sp.name,
          domain: extraDomains[0] ?? '',
          segment: '',
          clickUpSpaceId: sp.id,
          clickUpFolderId: '',
          clickUpListId: lists[0]?.id ?? '',
          clickUpListIds: listIds,
          contactEmails: mergedEmails,
          accountManagerStaffId: '',
          openTaskCount: 0,
          engagementCode: sp.id,
          emailDomains: extraDomains,
        },
        { upsert: true },
      )
      continue
    }

    for (const f of folders) {
      const cid = `f-${f.id}`
      const listsResp = await clickupRequest<CuListsResp>(
        token,
        `/folder/${encodeURIComponent(f.id)}/list?archived=false`,
      )
      const lists = listsResp.lists ?? []
      const listIds = lists.map((l) => l.id)
      const firstList = lists[0]
      const extraDomains = domainMap.get(cid) ?? []
      const mergedEmails = await mergedContactEmails(cid, contactEmailsMap.get(cid) ?? [])

      await ClientModel.findOneAndUpdate(
        { id: cid },
        {
          id: cid,
          name: f.name,
          domain: extraDomains[0] ?? '',
          segment: '',
          clickUpSpaceId: sp.id,
          clickUpFolderId: f.id,
          clickUpListId: firstList?.id ?? '',
          clickUpListIds: listIds,
          contactEmails: mergedEmails,
          accountManagerStaffId: '',
          openTaskCount: 0,
          engagementCode: f.id,
          emailDomains: extraDomains,
        },
        { upsert: true },
      )
    }
  }
}

export async function syncClickUpTimeEntries(
  token: string,
  teamId: string,
  startMs: number,
  endMs: number,
): Promise<number> {
  const path = `/team/${encodeURIComponent(teamId)}/time_entries?start_date=${startMs}&end_date=${endMs}`
  const data = await clickupRequest<CuTimeEntriesResp>(token, path)
  const rows = data.data ?? []

  const taskIds = [...new Set(rows.map((r) => r.task?.id).filter(Boolean))] as string[]
  const metaRows =
    taskIds.length > 0
      ? await ClickUpTaskModel.find({ id: { $in: taskIds } })
          .select(['id', 'resolvedTaskType', 'listName'])
          .lean()
      : []
  const metaByTask = new Map(
    metaRows.map((m) => [m.id, m as { resolvedTaskType: string; listName?: string }]),
  )

  let n = 0
  for (const te of rows) {
    const task = te.task
    if (!task?.id) continue
    const cid = clientIdFromTask(task)
    const staffId = String(te.user?.id ?? '')
    if (!staffId) continue
    const ms = Number(te.duration)
    const hours = Math.round((ms / 3600000) * 100) / 100
    const d = new Date(Number(te.start))
    const dateStr = d.toISOString().slice(0, 10)
    const id = `cu-te-${te.id}`
    const meta = metaByTask.get(task.id)
    const taskType =
      meta?.resolvedTaskType ??
      resolvedTaskTypeFromTagsAndList(task.tags, '')
    const clickUpListName = meta?.listName ?? ''

    await TimeEntryModel.findOneAndUpdate(
      { id },
      {
        id,
        date: dateStr,
        staffId,
        clientId: cid,
        taskType,
        hours,
        description: te.description?.trim() || task.name || '',
        clickUpTaskId: task.id,
        clickUpTaskName: task.name ?? '',
        clickUpListName,
      },
      { upsert: true },
    )
    n++
  }
  return n
}

export async function runClickUpSync(): Promise<{ ok: boolean; error?: string }> {
  const cfg = loadConfig()
  const token = cfg.CLICKUP_API_TOKEN?.trim()
  const teamId = cfg.CLICKUP_TEAM_ID
  if (!token) return { ok: false, error: 'CLICKUP_API_TOKEN missing' }

  try {
    await syncClickUpStructures(token, teamId)
    const taskStats = await syncClickUpTasks(token)
    const end = Date.now()
    const start = end - 180 * 24 * 60 * 60 * 1000
    const count = await syncClickUpTimeEntries(token, teamId, start, end)
    await SyncStateModel.findOneAndUpdate(
      { key: 'clickup' },
      {
        key: 'clickup',
        lastRunAt: new Date(),
        meta: {
          timeEntries: count,
          tasksUpserted: taskStats.upserted,
          taskClientsSynced: taskStats.clients,
        },
      },
      { upsert: true },
    )
    return { ok: true }
  } catch (e) {
    const err = e as { status?: number; body?: unknown }
    return {
      ok: false,
      error: JSON.stringify(err.body ?? err.status ?? String(e)),
    }
  }
}
