import { type NextRequest, NextResponse } from "next/server"
// import { initializeInterview } from "@/services/geminiService"
const { initializeInterview } = require("../../../services/geminiService")

// Mock database - replace with real database
const sessions: Record<string, any> = {}
let sessionCounter = 1

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Request body received:", JSON.stringify(body))
    console.log("[v0] interviewType value:", body.interviewType)

    const { interviewType } = body

    if (!interviewType) {
      console.error("[v0] Missing interviewType in request")
      return NextResponse.json({ success: false, message: "Missing required field: interviewType" }, { status: 400 })
    }

    const validTypes = ["behavioral", "technical", "system-design", "coding"]
    if (!validTypes.includes(interviewType)) {
      console.error(`[v0] Invalid interview type: ${interviewType}`)
      return NextResponse.json(
        {
          success: false,
          message: `Invalid interview type: ${interviewType}. Valid types are: ${validTypes.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Create new session
    const sessionId = `session_${sessionCounter++}`

    const firstQuestionData = await initializeInterview(interviewType)

    sessions[sessionId] = {
      id: sessionId,
      interviewType,
      conversationHistory: [],
      createdAt: new Date(),
    }

    console.log(`[v0] Created session ${sessionId} for type: ${interviewType}`)

    return NextResponse.json({
      success: true,
      sessionId,
      question: firstQuestionData.question,
      analysis: firstQuestionData.analysis,
      difficulty_level: firstQuestionData.difficulty_level,
    })
  } catch (error) {
    console.error("[v0] Error in /api/interview/start:", error)
    return NextResponse.json(
      { success: false, message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
