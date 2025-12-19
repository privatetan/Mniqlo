const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  /*
  await prisma.post.createMany({
    data: [
      { title: 'Welcome', content: 'This is your Next.js + Prisma app.' },
      { title: 'Second post', content: 'Edit or create posts using the form.' }
    ]
  })
  */

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'password123', // Simple password for now
    },
  })
  // Assuming alice and bob are defined elsewhere or are placeholders.
  // If not, this line might cause a ReferenceError.
  console.log({ user })
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
