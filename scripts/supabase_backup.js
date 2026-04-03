const axios = require('axios')
const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env')
  process.exit(1)
}

const tables = [
  'blast_history',
  'catalogues',
  'notifications',
  'products',
  'sales',
  'store_settings',
  'supply_history',
  'users',
  'visitors'
]

async function runBackup() {
  console.log('🚀 Starting Supabase Data Backup (via REST API)...')
  const snapshot = {}
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  
  for (const table of tables) {
    console.log(`📦 Fetching [${table}]...`)
    try {
      // Direct REST API Call to Supabase
      const response = await axios.get(`${supabaseUrl}/rest/v1/${table}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        params: {
          select: '*'
        }
      })
      
      snapshot[table] = response.data
      console.log(`✅ [${table}]: ${response.data.length} rows retrieved.`)
    } catch (err) {
      console.error(`❌ Failed to fetch ${table}:`, err.response ? err.response.data.message : err.message)
      snapshot[table] = []
    }
  }

  const backupDir = path.join(process.cwd(), 'supabase', 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const filePath = path.join(backupDir, `backup_${timestamp}.json`)
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2))
  
  console.log('\n✨ Backup Complete!')
  console.log(`📂 File saved to: ${filePath}`)
}

runBackup()
