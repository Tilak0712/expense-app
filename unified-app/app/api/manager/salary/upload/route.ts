import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Bind all operations in this request to the same authenticated manager context.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const requestedFileName = formData.get('fileName') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const originalFileName = requestedFileName || file.name || 'salary-sheet.csv'
    const safeFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Upload file to Supabase storage
    const filePath = `salary-uploads/${user.id}/${Date.now()}-${safeFileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('salary-uploads')
      .upload(filePath, file, {
        contentType: file.type
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Insert record into salary_uploads table
    const { error: dbError } = await supabase
      .from('salary_uploads')
      .insert({
        manager_id: user.id,
        file_name: originalFileName,
        file_path: uploadData.path,
        file_size: file.size,
        status: 'submitted'
      })

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Clean up the uploaded file if database insert fails
      await supabase.storage.from('salary-uploads').remove([filePath])
      return NextResponse.json({ error: dbError.message || 'Failed to save upload record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      fileName: originalFileName,
      filePath: uploadData.path
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
