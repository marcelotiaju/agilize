const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const name = 'RAFAEL DA SILVA MATOS'
  const members = await prisma.contributor.findMany({
    where: {
      name: {
        contains: name
      }
    },
    include: {
      congregation: true
    }
  })
  
  console.log(JSON.stringify(members, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
