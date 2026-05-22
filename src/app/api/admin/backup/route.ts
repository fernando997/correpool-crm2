import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function fetchAllLeads(supabase: ReturnType<typeof createClient>) {
  const PAGE = 1000
  const result: unknown[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase.from('leads').select('*').range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    result.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return result
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key')
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let data: unknown[]
  try {
    data = await fetchAllLeads(supabase)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  const json = JSON.stringify(data, null, 2)
  const date = new Date().toISOString().split('T')[0]

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup-leads-${date}.json"`,
    },
  })
}
