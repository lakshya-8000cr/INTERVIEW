require("dotenv").config()

// Attempt to load the Gemini client but fail gracefully for local development.
let GoogleGenerativeAI = null
let genAI = null
let model = null
let geminiAvailable = false

try {
  // require may throw if the package is not installed
  GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    model = genAI.getGenerativeModel({ model: "gemini-pro" })
    geminiAvailable = true
  } else {
    console.warn("GEMINI_API_KEY not set — geminiService will run in demo fallback mode")
  }
} catch (err) {
  console.warn(
    "Could not initialize @google/generative-ai — running in demo fallback mode.",
    err && err.message ? err.message : err,
  )
}

const SYSTEM_PROMPTS = {
  technical: `
You are an AI-powered technical interviewer conducting a mock technical interview. Your role is to ask progressive questions about programming concepts, data structures, algorithms, system design, and coding best practices. Questions should start easy and become harder based on the user's responses. Analyze each answer for technical accuracy, problem-solving approach, and depth of understanding.

Always respond in valid JSON format with the following fields:
- "question": The next question to ask the user.
- "analysis": A brief analysis of the previous answer (if applicable), including feedback on correctness and suggestions.
- "difficulty_level": "easy", "medium", or "hard" based on the question's complexity.

For the initial question, "analysis" can be an empty string or omitted if not applicable.
Ensure questions are contextual and build upon previous interactions.
  `,
}

async function initializeInterview(interviewType) {
  try {
    if (!SYSTEM_PROMPTS[interviewType]) {
      throw new Error(`Unsupported interview type: ${interviewType}`)
    }

    // If Gemini isn't available, return a demo/stub question so the server can run locally
    if (!geminiAvailable || !model) {
      return {
        question: "Tell me about a time you solved a difficult bug in production.",
        analysis: "",
        difficulty_level: "medium",
      }
    }

    const prompt = `${SYSTEM_PROMPTS[interviewType]}\n\nGenerate the first question to start the interview. Respond in JSON format.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    const parsed = JSON.parse(text.trim())
    return {
      question: parsed.question,
      analysis: parsed.analysis || "",
      difficulty_level: parsed.difficulty_level,
    }
  } catch (error) {
    console.error("Error in initializeInterview:", error)
    if (error.message.includes("API_KEY")) {
      throw new Error("Gemini API key is missing or invalid.")
    }
    throw new Error("Failed to initialize interview. Please try again.")
  }
}

async function generateNextQuestion(conversationHistory, userAnswer, interviewType) {
  try {
    if (!SYSTEM_PROMPTS[interviewType]) {
      throw new Error(`Unsupported interview type: ${interviewType}`)
    }

    // Build conversation history string
    let historyStr = ""
    conversationHistory.forEach((pair, index) => {
      historyStr += `Q${index + 1}: ${pair.question}\nA${index + 1}: ${pair.answer}\n\n`
    })

    const prompt = `${SYSTEM_PROMPTS[interviewType]}\n\nConversation History:\n${historyStr}\nLatest Answer: ${userAnswer}\n\nAnalyze the latest answer and generate the next contextual question. Respond in JSON format.`

    if (!geminiAvailable || !model) {
      // Simple fallback: pick a next question based on history length
      const nextQ =
        conversationHistory.length < 1
          ? "Can you walk me through your debugging process step-by-step?"
          : "How would you prevent this class of bugs in the future?"
      return {
        question: nextQ,
        analysis: "Demo analysis: focus on structure and measurable examples.",
        difficulty_level: conversationHistory.length < 1 ? "easy" : "medium",
      }
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    const parsed = JSON.parse(text.trim())
    return {
      question: parsed.question,
      analysis: parsed.analysis,
      difficulty_level: parsed.difficulty_level,
    }
  } catch (error) {
    console.error("Error in generateNextQuestion:", error)
    if (error.message.includes("API_KEY")) {
      throw new Error("Gemini API key is missing or invalid.")
    }
    throw new Error("Failed to generate next question. Please try again.")
  }
}

async function generateFinalFeedback(conversationHistory, interviewType) {
  try {
    if (!SYSTEM_PROMPTS[interviewType]) {
      throw new Error(`Unsupported interview type: ${interviewType}`)
    }

    // Build full conversation history string
    let historyStr = ""
    conversationHistory.forEach((pair, index) => {
      historyStr += `Q${index + 1}: ${pair.question}\nA${index + 1}: ${pair.answer}\n\n`
    })

    const prompt = `${SYSTEM_PROMPTS[interviewType]}\n\nFull Conversation History:\n${historyStr}\n\nNow, provide comprehensive feedback on the entire interview. Analyze all answers for technical accuracy, evaluate communication quality and clarity, provide an overall score from 0.0 to 10.0, identify strengths, and suggest areas of improvement. Respond in JSON format with fields: "overall_score", "technical_accuracy", "communication_quality", "strengths", "areas_of_improvement".`

    if (!geminiAvailable || !model) {
      return {
        overall_score: 7.5,
        technical_accuracy: "Good — solid core knowledge with minor gaps",
        communication_quality: "Clear and structured",
        strengths: "Problem-solving and debugging approach",
        areas_of_improvement: "Provide more examples and mention trade-offs",
      }
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    const parsed = JSON.parse(text.trim())
    return {
      overall_score: parsed.overall_score,
      technical_accuracy: parsed.technical_accuracy,
      communication_quality: parsed.communication_quality,
      strengths: parsed.strengths,
      areas_of_improvement: parsed.areas_of_improvement,
    }
  } catch (error) {
    console.error("Error in generateFinalFeedback:", error)
    if (error.message.includes("API_KEY")) {
      throw new Error("Gemini API key is missing or invalid.")
    }
    throw new Error("Failed to generate feedback. Please try again.")
  }
}

module.exports = {
  initializeInterview,
  generateNextQuestion,
  generateFinalFeedback,
}
