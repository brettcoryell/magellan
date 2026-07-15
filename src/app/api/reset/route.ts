export async function POST() {
  return Response.json(
    { error: 'Starting over is disabled to protect existing career work.' },
    { status: 410 }
  )
}
