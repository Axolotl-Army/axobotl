// Lazy database access - avoids module-level throws during Next.js build
// Import models and sequelize only when actually needed at runtime

let _db: typeof import('../../shared/database') | null = null
let _models: typeof import('../../shared/models') | null = null

async function getDb() {
  if (!_db) _db = await import('../../shared/database')
  return _db.default
}

async function getModels() {
  if (!_models) _models = await import('../../shared/models')
  return _models
}

export async function getSequelize() {
  return getDb()
}

export async function getGuild() {
  const m = await getModels()
  return m.Guild
}

export async function getCommandLog() {
  const m = await getModels()
  return m.CommandLog
}

export async function getGuildPlugin() {
  const m = await getModels()
  return m.GuildPlugin
}

export async function getLevelRole() {
  const m = await getModels()
  return m.LevelRole
}
