import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('csv_uploads')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('[CsvUploadsAPI] Error fetching upload:', error)
      return NextResponse.json(
        { error: 'Failed to fetch upload', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ upload: data })
  } catch (error) {
    console.error('[CsvUploadsAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch upload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('csv_uploads')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[CsvUploadsAPI] Error deleting upload:', error)
      return NextResponse.json(
        { error: 'Failed to delete upload', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CsvUploadsAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete upload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
