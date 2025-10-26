import { type NextRequest, NextResponse } from "next/server"
import { generateFinalFeedback } from "services"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, conversationHistory, interviewType } = body

    if (!sessionId) {
      return NextResponse.json({ success: false, message: "Missing sessionId" }, { status: 400 })
    }

    const feedback = await generateFinalFeedback(conversationHistory || [], interviewType)

    console.log(`[v0] Ending session ${sessionId}`)

    return NextResponse.json({
      success: true,
      feedback,
      duration_minutes: 15,
    })
  } catch (error) {
    console.error("[v0] Error in /api/interview/end:", error)
    return NextResponse.json(
      { success: false, message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
