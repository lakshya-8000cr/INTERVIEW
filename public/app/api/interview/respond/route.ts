import { type NextRequest, NextResponse } from "next/server"
const { generateNextQuestion } = require("../../../services/geminiService")

// This would be imported from the start route in a real app
const sessions: Record<string, any> = {}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, answer, conversationHistory, interviewType } = body

    if (!sessionId || !answer) {
      return NextResponse.json({ success: false, message: "Missing sessionId or answer" }, { status: 400 })
    }

    const nextQuestionData = await generateNextQuestion(conversationHistory || [], answer, interviewType)

    console.log(`[v0] Session ${sessionId}: Generated next question`)

    return NextResponse.json({
      success: true,
      question: nextQuestionData.question,
      analysis: nextQuestionData.analysis,
      difficulty_level: nextQuestionData.difficulty_level,
    })
  } catch (error) {
    console.error("[v0] Error in /api/interview/respond:", error)
    return NextResponse.json(
      { success: false, message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
