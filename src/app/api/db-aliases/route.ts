import { NextResponse } from 'next/server'

export async function GET() {
  const aliasesEnv = process.env.DB_ALIASES || ""
  
  // O formato esperado é "ALIAS1:Nome 1,ALIAS2:Nome 2"
  const aliases = aliasesEnv.split(',').filter(Boolean).map(item => {
    const [key, label] = item.split(':')
    return {
      key: key.trim(),
      label: (label || key).trim()
    }
  })

  return NextResponse.json(aliases)
}
