const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  await prisma.post.createMany({
    data: [
      { title: 'Welcome', content: 'This is your Next.js + Prisma app.' },
      { title: 'Second post', content: 'Edit or create posts using the form.' }
    ]
  })
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
