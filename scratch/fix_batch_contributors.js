const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const batchId = 'cmnt9fg070064kukgx695ad83'
  
  const rows = await prisma.bankIntegrationRow.findMany({
    where: { batchId, contributorId: null }
  })
  
  console.log(`Processing ${rows.length} rows for batch ${batchId}...`)
  
  let fixedCount = 0
  for (const row of rows) {
    const source = JSON.parse(row.sourceData)
    const cpf = source['Cpf / Cnpj'] || source['cpf'] || source['documento']
    
    if (cpf && typeof cpf === 'string' && cpf.replace(/\D/g, '').length >= 11) {
      const cleanCpf = cpf.replace(/\D/g, '')
      const ct = await prisma.contributor.findFirst({
        where: { cpf: cleanCpf }
      })
      
      if (ct) {
        await prisma.bankIntegrationRow.update({
          where: { id: row.id },
          data: { 
            contributorId: ct.id,
            contributorName: ct.name
          }
        })
        fixedCount++
      }
    }
  }
  
  console.log(`Finished. Fixed ${fixedCount} rows.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
