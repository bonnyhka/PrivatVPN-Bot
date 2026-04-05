import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

/**
 * Custom route to serve uploads from public/uploads.
 * This ensures that dynamically uploaded files are accessible even in production,
 * bypassing Next.js static folder indexing issues.
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const params = await props.params;
    const { filename } = params
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename)

    if (!existsSync(filePath)) {
      return new Response('File not found', { status: 404 })
    }

    const file = await readFile(filePath)
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'

    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving upload:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
