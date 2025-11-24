import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar congregações de teste
  /*const congregation1 = await prisma.congregation.upsert({
    where: { code: 'CG001' },
    update: {},
    create: {
      code: 'CG001',
      name: 'Primeira Igreja Batista'
    }
  })

  const congregation2 = await prisma.congregation.upsert({
    where: { code: 'CG002' },
    update: {},
    create: {
      code: 'CG002',
      name: 'Segunda Igreja Batista'
    }
  })

  const congregation3 = await prisma.congregation.upsert({
    where: { code: 'CG003' },
    update: {},
    create: {
      code: 'CG003',
      name: 'Igreja Batista Central'
    }
  })

  console.log('✅ Congregações criadas:', { congregation1, congregation2, congregation3 })
*/
  // Criar usuário de teste
  // const hashedPassword = await bcrypt.hash('19321932', 12)
  
  // const user1 = await prisma.user.upsert({
  //   where: { email: 'admin@igreja.com' },
  //   update: {},
  //   create: {
  //     name: 'Administrador',
  //     email: 'admin@igreja.com',
  //     cpf: '12345678901',
  //     phone: '(11) 99999-9999',
  //     password: hashedPassword,
  //     validFrom: new Date(),
  //     validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  //     historyDays: 30,
  //   }
  // })

  const profile1 = await prisma.profile.create({
    data: {
      name: 'Administrador',
      canExport: true,
      canDelete: true,
      // Novas permissões
      canLaunchEntry: true,
      canLaunchTithe       :true,
      canLaunchExpense     :true,
      canApproveEntry      :true,
      canApproveTithe      :true,
      canApproveExpense    :true,
      canCreate            :true,
      canEdit              :true,
      canExclude           :true,
      canManageUsers       :true,
      canManageSummary     :true,
      canApproveTreasury   :true,
      canApproveAccountant :true,
      canApproveDirector   :true,
          }
  })

  // const user2 = await prisma.user.upsert({
  //   where: { email: 'usuario@igreja.com' },
  //   update: {},
  //   create: {
  //     name: 'Usuário Teste',
  //     email: 'usuario@igreja.com',
  //     cpf: '98765432100',
  //     phone: '(11) 88888-8888',
  //     password: hashedPassword,
  //     validFrom: new Date(),
  //     validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  //     historyDays: 30,
  //     canExport: false,
  //     canDelete: false
  //   }
  // })

  console.log('✅ Usuários criados:', { user1 })
/*
  // Associar usuários às congregações
  await prisma.userCongregation.upsert({
    where: {
      userId_congregationId: {
        userId: user1.id,
        congregationId: congregation1.id
      }
    },
    update: {},
    create: {
      userId: user1.id,
      congregationId: congregation1.id
    }
  })

  await prisma.userCongregation.upsert({
    where: {
      userId_congregationId: {
        userId: user1.id,
        congregationId: congregation2.id
      }
    },
    update: {},
    create: {
      userId: user1.id,
      congregationId: congregation2.id
    }
  })

  await prisma.userCongregation.upsert({
    where: {
      userId_congregationId: {
        userId: user2.id,
        congregationId: congregation1.id
      }
    },
    update: {},
    create: {
      userId: user2.id,
      congregationId: congregation1.id
    }
  })

  console.log('✅ Associações usuário-congregação criadas')
*/

  // Criar Fornecedor
 
  // await prisma.supplier.createMany({
  //   data: [{
  //     code: '0000',
  //     razaoSocial: 'Fornecedor Avulso'
  //   }]

  // })

    // Criar Contribuinte
 
  // await prisma.contributor.createMany({
  //   data: [{
  //     code: '0000',
  //     name: 'Contribuinte Avulso'
  //   }]

  // })


  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
