const MOCK_QUESTIONS = {
  behavioral: [
    "Tell me about a time when you had to work with a difficult team member. How did you handle it?",
    "Describe a situation where you had to meet a tight deadline. What was your approach?",
    "Give an example of when you showed leadership skills.",
    "Tell me about a time you failed. What did you learn from it?",
    "Describe a situation where you had to adapt to change quickly.",
  ],
  technical: [
    "Explain the difference between REST and GraphQL APIs.",
    "What is the difference between let, const, and var in JavaScript?",
    "How does the event loop work in JavaScript?",
    "Explain what a closure is and give an example.",
    "What are the main differences between SQL and NoSQL databases?",
  ],
  "system-design": [
    "Design a URL shortening service like bit.ly.",
    "How would you design a real-time chat application?",
    "Design a social media feed system that can handle millions of users.",
    "How would you design a video streaming platform?",
    "Design a distributed cache system.",
  ],
  coding: [
    "Write a function to reverse a string without using built-in reverse methods.",
    "How would you find the longest substring without repeating characters?",
    "Write a function to check if a number is a palindrome.",
    "How would you implement a binary search algorithm?",
    "Write a function to flatten a nested array.",
  ],
}

// Enhanced UI state management for mock-interview with Web Speech API
let currentSessionType = "behavioral"
let currentQuestionIndex = 0
let totalQuestions = 5
let conversationHistory = []
let isRecording = false
let mediaRecorder = null
let audioChunks = []
let recognitionInstance = null

document.addEventListener("DOMContentLoaded", () => {
  const setupScreen = document.getElementById("setupScreen")
  const sessionScreen = document.getElementById("sessionScreen")
  const resultsScreen = document.getElementById("resultsScreen")
  const typeButtons = Array.from(document.querySelectorAll(".type-btn"))
  const startBtn = document.getElementById("startBtn")
  const questionText = document.getElementById("questionText")
  const transcriptEl = document.getElementById("transcript")
  const questionCounter = document.getElementById("questionCounter")
  const sessionTypeLabel = document.getElementById("sessionType")
  const nextBtn = document.getElementById("nextBtn")
  const pauseBtn = document.getElementById("pauseBtn")
  const endBtn = document.getElementById("endBtn")
  const recordBtn = document.getElementById("recordBtn")
  const numQuestionsSelect = document.getElementById("numQuestions")
  const permissionBanner = document.getElementById("permissionBanner")
  const retryMicBtn = document.getElementById("retryMicBtn")
  const permissionHelpBtn = document.getElementById("permissionHelpBtn")
  const dismissPermissionBanner = document.getElementById("dismissPermissionBanner")
  const permissionHelp = document.getElementById("permissionHelp")

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    recognitionInstance = new SpeechRecognition()
    recognitionInstance.continuous = true
    recognitionInstance.interimResults = true
    recognitionInstance.lang = "en-US"
  }

  // Type selection
  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeButtons.forEach((b) => b.classList.remove("selected"))
      btn.classList.add("selected")
      currentSessionType = btn.dataset.type
    })
  })

  // Start interview
  startBtn.addEventListener("click", async () => {
    totalQuestions = Number.parseInt(numQuestionsSelect.value)
    currentQuestionIndex = 0
    conversationHistory = []

    // Check microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      permissionBanner.hidden = true

      // Switch to session screen
      setupScreen.classList.remove("active")
      sessionScreen.classList.add("active")
      sessionTypeLabel.textContent = `Type: ${currentSessionType.charAt(0).toUpperCase() + currentSessionType.slice(1)}`

      // Load first question
      loadFirstQuestion()
    } catch (err) {
      console.error("[v0] Microphone permission denied:", err)
      permissionBanner.hidden = false
    }
  })

  function loadFirstQuestion() {
    try {
      currentQuestionIndex = 0
      questionCounter.textContent = `Question ${currentQuestionIndex + 1} / ${totalQuestions}`
      transcriptEl.innerHTML = ""

      const questions = MOCK_QUESTIONS[currentSessionType]
      if (!questions || questions.length === 0) {
        throw new Error("No questions available for this type")
      }

      const question = questions[currentQuestionIndex % questions.length]
      questionText.textContent = question
      conversationHistory.push({ question: question, answer: "" })
    } catch (err) {
      console.error("[v0] Error loading first question:", err)
      questionText.textContent = "Error loading question. Please try again."
    }
  }

  function loadNextQuestion(userAnswer) {
    try {
      if (conversationHistory.length > 0) {
        conversationHistory[conversationHistory.length - 1].answer = userAnswer
      }

      currentQuestionIndex++
      questionCounter.textContent = `Question ${currentQuestionIndex + 1} / ${totalQuestions}`

      const questions = MOCK_QUESTIONS[currentSessionType]
      if (!questions || questions.length === 0) {
        throw new Error("No questions available for this type")
      }

      const question = questions[currentQuestionIndex % questions.length]
      questionText.textContent = question
      conversationHistory.push({ question: question, answer: "" })
    } catch (err) {
      console.error("[v0] Error loading next question:", err)
      questionText.textContent = "Error loading question. Please try again."
    }
  }

  nextBtn.addEventListener("click", () => {
    // Get the user's answer from transcript
    const userAnswer = transcriptEl.textContent.trim()

    if (currentQuestionIndex < totalQuestions - 1) {
      loadNextQuestion(userAnswer)
      transcriptEl.innerHTML = ""
    } else {
      // Last question answered, show results
      if (conversationHistory.length > 0) {
        conversationHistory[conversationHistory.length - 1].answer = userAnswer
      }
      showResults()
    }
  })

  // End button
  endBtn.addEventListener("click", () => {
    if (isRecording) {
      mediaRecorder.stop()
      isRecording = false
    }
    showResults()
  })

  function showResults() {
    try {
      sessionScreen.classList.remove("active")
      resultsScreen.classList.add("active")

      // Generate mock feedback
      const overallScore = Math.floor(Math.random() * 40) + 60 // 60-100%
      const feedbackMessages = [
        "Great communication skills! You explained your thoughts clearly.",
        "Good problem-solving approach. Consider adding more technical depth.",
        "Excellent! You demonstrated strong knowledge in this area.",
        "Nice work! Your answer was well-structured and comprehensive.",
        "Good effort! Try to provide more specific examples next time.",
      ]

      const randomFeedback = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)]

      document.getElementById("overallScore").textContent = `${overallScore}%`
      document.getElementById("aiFeedback").textContent = randomFeedback

      console.log("[v0] Interview completed:", {
        type: currentSessionType,
        questionsAnswered: currentQuestionIndex + 1,
        score: overallScore,
        conversation: conversationHistory,
      })
    } catch (err) {
      console.error("[v0] Error showing results:", err)
      document.getElementById("aiFeedback").textContent = "Session completed!"
    }
  }

  recordBtn.addEventListener("click", async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorder = new MediaRecorder(stream)
        audioChunks = []

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data)
        }

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
        }

        mediaRecorder.start()
        isRecording = true
        recordBtn.textContent = "Stop Recording"
        recordBtn.classList.add("recording")

        // Start speech recognition
        if (recognitionInstance) {
          recognitionInstance.start()
          recognitionInstance.onresult = (event) => {
            let interimTranscript = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                transcriptEl.innerHTML += `<p>${transcript}</p>`
              } else {
                interimTranscript += transcript
              }
            }
            if (interimTranscript) {
              transcriptEl.innerHTML = transcriptEl.innerHTML.replace(/<p class="interim">.*<\/p>/, "")
              transcriptEl.innerHTML += `<p class="interim">${interimTranscript}</p>`
            }
          }
        }
      } catch (err) {
        console.error("[v0] Recording error:", err)
        permissionBanner.hidden = false
      }
    } else {
      isRecording = false
      mediaRecorder.stop()
      if (recognitionInstance) {
        recognitionInstance.stop()
      }
      recordBtn.textContent = "Start Recording"
      recordBtn.classList.remove("recording")
    }
  })
})
