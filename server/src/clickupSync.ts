import { clickupRequest } from './clickupApi.js'
import { loadConfig, parseClientDomainMap } from './config.js'
import {
  ClientModel,
  StaffModel,
  TimeEntryModel,
  SyncStateModel,
} from './models.js'

const TASK_TYPE_NAMES = new Set([
  'One-time',
  'Recurring',
  'OT',
  'Month end',
  'Payroll',
])

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

function initialsFromName(name: string): string {
  const p = name.split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return `${p[0]![0]!}${p[1]![0]!}`.toUpperCase()
}

function pickTaskType(task: CuTimeTask): string {
  for (const t of task.tags ?? []) {
    const n = t.name?.trim()
    if (n && TASK_TYPE_NAMES.has(n)) return n
  }
  return 'Recurring'
}

function clientIdFromTask(task: CuTimeTask): string {
  const fid = task.folder?.id
  if (fid) return `f-${fid}`
  const sid = task.space?.id
  return sid ? `s-${sid}` : 'unassigned'
}

export async function syncClickUpStructures(
  token: string,
  teamId: string,
): Promise<void> {
  const cfg = loadConfig()
  const domainMap = parseClientDomainMap(cfg.CLIENT_EMAIL_DOMAINS_JSON)

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
      await ClientModel.findOneAndUpdate(
        { id: cid },
        {
          id: cid,
          name: sp.name,
          domain: extraDomains[0] ?? '',
          segment: '',
          clickUpSpaceId: sp.id,
          clickUpFolderId: '',
          clickUpListId: '',
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
      const firstList = lists[0]
      const extraDomains = domainMap.get(cid) ?? []

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
    await TimeEntryModel.findOneAndUpdate(
      { id },
      {
        id,
        date: dateStr,
        staffId,
        clientId: cid,
        taskType: pickTaskType(task),
        hours,
        description: te.description?.trim() || task.name || '',
        clickUpTaskId: task.id,
        clickUpTaskName: task.name ?? '',
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
    const end = Date.now()
    const start = end - 180 * 24 * 60 * 60 * 1000
    const count = await syncClickUpTimeEntries(token, teamId, start, end)
    await SyncStateModel.findOneAndUpdate(
      { key: 'clickup' },
      { key: 'clickup', lastRunAt: new Date(), meta: { timeEntries: count } },
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
