import { execSync } from 'child_process'

/**
 * Script de migração multi-banco.
 * Lê todos os aliases do .env e executa `prisma migrate deploy` para cada um.
 * Use: tsx --env-file=.env scripts/migrate-all.ts
 */
async function run() {
  const aliasesEnv = process.env.DB_ALIASES || ""
  const aliases = aliasesEnv.split(',').filter(Boolean).map(item => item.split(':')[0].trim())

  if (aliases.length === 0) {
    console.log("⚠️  Nenhum alias found em DB_ALIASES.")
    return
  }

  console.log(`🚀 Iniciando migrações para ${aliases.length} bancos...`)

  for (const alias of aliases) {
    const url = process.env[`DB_ALIAS_${alias.toUpperCase()}`]
    
    if (!url) {
      console.warn(`\n⚠️  URL não encontrada para o alias: ${alias}. Pulando...`)
      continue
    }

    console.log(`\n🔄 Migrando: ${alias}...`)
    
    try {
      execSync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: url
        },
        stdio: 'inherit'
      })
      console.log(`✅ ${alias} finalizado com sucesso.`)
    } catch (error) {
      console.error(`\n❌ Erro ao migrar banco ${alias}.`)
      process.exit(1)
    }
  }

  console.log("\n✨ Todas as migrações concluídas.")
}

run()
