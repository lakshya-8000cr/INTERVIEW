// Enhanced UI state management for mock-interview with Web Speech API
document.addEventListener('DOMContentLoaded', () => {
    const setupScreen = document.getElementById('setupScreen');
    const sessionScreen = document.getElementById('sessionScreen');
    const typeButtons = Array.from(document.querySelectorAll('.type-btn'));
    const startBtn = document.getElementById('startBtn');
    const questionText = document.getElementById('questionText');
    const transcriptEl = document.getElementById('transcript');
    const questionCounter = document.getElementById('questionCounter');
    const sessionTypeLabel = document.getElementById('sessionType');
    const nextBtn = document.getElementById('nextBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const endBtn = document.getElementById('endBtn');
    const recordBtn = document.getElementById('recordBtn');
    const numQuestionsSelect = document.getElementById('numQuestions');

    // Web Speech API feature detection
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const synth = window.speechSynthesis || null;

    // recognition state
    let recognition = null;
    let isRecording = false;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    let state = {
        type: 'behavioral',
        questions: [],
        index: 0,
        total: parseInt(numQuestionsSelect.value || 5, 10),
        running: false
    };
    let sessionStartTs = null;
    let serverSessionId = null;
    let serverMode = false; // whether this session is persisted on server

    // demo question pools
    const POOLS = {
        behavioral: [
            'Tell me about a time you faced a challenge at work.',
            'Describe a situation where you showed leadership.',
            'Give an example of a time you had to resolve a conflict.'
        ],
        technical: [
            'Explain the difference between processes and threads.',
            'How would you optimize a slow database query?'
        ],
        'system-design': [
            'Design a URL shortening service.',
            'Design a real-time chat system.'
        ],
        coding: [
            'Write a function to reverse a linked list.',
            'How would you detect a cycle in a directed graph?'
        ]
    };

    // build recording indicator UI (injected)
    const recordingIndicator = document.createElement('div');
    recordingIndicator.className = 'recording-indicator';
    recordingIndicator.innerHTML = `
        <div class="dot" aria-hidden="true"></div>
        <div class="wave">
            <span></span><span></span><span></span><span></span>
        </div>
    `;
    recordingIndicator.style.display = 'none';
    // append to session-top (if exists) or sessionScreen
    const sessionTop = document.querySelector('.session-top') || sessionScreen;
    sessionTop.appendChild(recordingIndicator);
    // permission banner elements
    const permissionBanner = document.getElementById('permissionBanner');
    const retryMicBtn = document.getElementById('retryMicBtn');
    const permissionHelpBtn = document.getElementById('permissionHelpBtn');
    const permissionHelp = document.getElementById('permissionHelp');
    const dismissPermissionBanner = document.getElementById('dismissPermissionBanner');

    // Type selection
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.type = btn.dataset.type;
        });
    });

    startBtn.addEventListener('click', async () => {
        state.total = parseInt(numQuestionsSelect.value, 10);
        await startSession();
    });

    // Manual recording control (recommended): toggle recognition when session is running
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (!state.running) {
                appendTranscript('Start a session first to use recording.', 'system');
                return;
            }

            // If currently recording, stop; otherwise start
            if (isRecording) {
                stopRecognition();
                updateRecordBtn(false);
            } else {
                startRecognition();
                updateRecordBtn(true);
            }
        });
    }

    nextBtn.addEventListener('click', () => {
        goNext();
    });

    pauseBtn.addEventListener('click', () => {
        // Pause toggles recognition and TTS
        if (state.running) {
            if (isRecording) {
                stopRecognition();
                pauseBtn.textContent = 'Resume';
            } else {
                startRecognition();
                pauseBtn.textContent = 'Pause';
            }
        }
    });

    endBtn.addEventListener('click', () => {
        endSession();
    });

    /* Session lifecycle */
    async function startSession() {
        const pool = POOLS[state.type] || POOLS.behavioral;
        state.questions = [];
        for (let i = 0; i < state.total; i++) {
            state.questions.push(pool[i % pool.length]);
        }
    state.index = 0;
    state.running = true;
        retryCount = 0;
    sessionStartTs = Date.now();

        // show session screen
        setupScreen.classList.remove('active');
        sessionScreen.classList.add('active');

        sessionTypeLabel.textContent = `Type: ${capitalize(state.type)}`;

        // Ensure microphone permission before speaking/starting recognition
        const micOk = await ensureMicrophonePermission();
        if (!micOk) {
            appendTranscript('Microphone permission was denied. Please enable microphone access and try again.', 'system');
            showPermissionBanner('Microphone access is blocked. Allow microphone in your browser and retry.');
            // keep user on setup screen
            state.running = false;
            setTimeout(() => {
                sessionScreen.classList.remove('active');
                setupScreen.classList.add('active');
            }, 300);
            return;
        }

        // Attempt to start a server-backed session if user is authenticated
        const startedOnServer = await tryStartServerSession();
        if (!startedOnServer) {
            // fallback to local questions
            updateQuestion();
        }
        appendTranscript('Session started — good luck!', 'system');

        // Attempt to start recognition after speaking the first question
        startRecognition();
    }

    async function tryStartServerSession() {
        // try to create a server session. If it fails (401 or server error), return false to use local mode
        try {
            const payload = { interviewType: serverAcceptsType(state.type) ? state.type : 'technical' };
            const res = await fetch('/api/interview/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                console.warn('Server session start failed', res.status);
                return false;
            }
            const data = await res.json();
            if (data && data.success && data.sessionId) {
                serverSessionId = data.sessionId;
                serverMode = true;
                // use server-provided first question if present
                if (data.question) {
                    state.questions = [data.question];
                    state.index = 0;
                }
                appendTranscript('Server-backed session started.', 'system');
                // render initial question from server
                updateQuestion();
                return true;
            }
            return false;
        } catch (err) {
            console.warn('Could not start server session', err);
            return false;
        }
    }

    function serverAcceptsType(type) {
        // server currently accepts 'technical' only per backend; map others to 'technical'
        const allowed = ['technical'];
        return allowed.includes(type);
    }

    /* Ensure mic permission: try Permissions API first then fall back to getUserMedia prompt */
    async function ensureMicrophonePermission() {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const status = await navigator.permissions.query({ name: 'microphone' });
                    if (status.state === 'granted') return true;
                    if (status.state === 'denied') return false;
                    // if prompt, fall through to getUserMedia to force prompt
                } catch (e) {
                    // some browsers don't support querying 'microphone' even when permissions API exists
                }
            }

            // Ask for audio access explicitly; immediately stop tracks after prompt
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    // stop all tracks
                    stream.getTracks().forEach(t => t.stop());
                    return true;
                } catch (err) {
                    console.warn('getUserMedia audio denied or unavailable', err);
                    return false;
                }
            }
        } catch (err) {
            console.warn('Permission check failed', err);
        }
        return false;
    }

    /* Permission banner helpers */
    function showPermissionBanner(message) {
        try {
            if (!permissionBanner) return;
            permissionBanner.removeAttribute('hidden');
            permissionBanner.querySelector('.perm-msg').textContent = message || permissionBanner.querySelector('.perm-msg').textContent;
        } catch (err) { /* ignore */ }
    }

    function hidePermissionBanner() {
        try {
            if (!permissionBanner) return;
            permissionBanner.setAttribute('hidden', '');
            if (permissionHelp) {
                permissionHelp.setAttribute('hidden', '');
            }
        } catch (err) { /* ignore */ }
    }

    // retry button: re-run permission check and, if granted, continue session
    if (retryMicBtn) {
        retryMicBtn.addEventListener('click', async () => {
            appendTranscript('Retrying microphone permission...', 'system');
            const ok = await ensureMicrophonePermission();
            if (ok) {
                appendTranscript('Microphone permission granted.', 'system');
                hidePermissionBanner();
                // if a session is intended to be running, start recognition
                if (state.running) startRecognition();
            } else {
                appendTranscript('Microphone still denied. Check browser settings and retry.', 'system');
            }
        });
    }

    if (permissionHelpBtn && permissionHelp) {
        permissionHelpBtn.addEventListener('click', () => {
            const isHidden = permissionHelp.hasAttribute('hidden');
            if (isHidden) permissionHelp.removeAttribute('hidden');
            else permissionHelp.setAttribute('hidden', '');
        });
    }

    if (dismissPermissionBanner) {
        dismissPermissionBanner.addEventListener('click', () => {
            hidePermissionBanner();
        });
    }

    function updateQuestion() {
        const q = state.questions[state.index] || 'No more questions.';
        questionText.textContent = q;
        questionCounter.textContent = `Question ${state.index + 1} / ${state.total}`;
        speakQuestion(q);
    }

    function goNext() {
        // stop any speaking so next question isn't overlapped
        if (synth) synth.cancel();

        if (state.index < state.total - 1) {
            state.index += 1;
            updateQuestion();
            appendTranscript(`--- Next question (#${state.index + 1}) ---`, 'system');
        } else {
            appendTranscript('Reached end of session.', 'system');
            endSession();
        }
    }

    function endSession() {
        state.running = false;
        stopRecognition(true);
        if (synth) synth.cancel();
        appendTranscript('Session ended.', 'system');

        // If this was a server-backed session, finalize on server and use server feedback
        if (serverMode && serverSessionId) {
            endServerSession(serverSessionId).catch(err => {
                console.warn('Failed to end server session, falling back to local summary', err);
                const summary = buildSessionSummary();
                saveSessionToLocalHistory(summary);
                showResults(summary);
            });
            return;
        }

        // Build a lightweight session summary and show results screen (local)
        const summary = buildSessionSummary();
        saveSessionToLocalHistory(summary);
        showResults(summary);
    }

    async function endServerSession(sessionId) {
        try {
            // call end endpoint
            const res = await fetch('/api/interview/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: Number(sessionId) })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error('Server end failed: ' + text);
            }
            const endData = await res.json();
            if (!endData.success) throw new Error(endData.message || 'End failed');

            // fetch full session details
            const fetchRes = await fetch(`/api/interview/session/${sessionId}`);
            if (!fetchRes.ok) throw new Error('Failed to fetch session details');
            const sessionData = await fetchRes.json();
            if (!sessionData.success) throw new Error('Session fetch failed');

            // build summary from server data
            const summary = buildSummaryFromServer(sessionData.session, sessionData.conversations, sessionData.feedback);
            saveSessionToLocalHistory(summary);
            showResults(summary);
        } catch (err) {
            console.error('endServerSession error', err);
            throw err;
        }
    }

    function buildSummaryFromServer(session, conversations, feedback) {
        const qa = [];
        let currentQ = null;
        (conversations || []).forEach(msg => {
            if (msg.message_type === 'question') currentQ = msg.content;
            else if (msg.message_type === 'answer' && currentQ) { qa.push({ question: currentQ, answer: msg.content }); currentQ = null; }
        });

        const overall = feedback && feedback.overall_score ? Math.round(feedback.overall_score) : null;
        const clarity = feedback && feedback.communication_quality ? Math.round(feedback.communication_quality) : null;
        const responseSpeed = feedback && feedback.technical_accuracy ? Math.round(feedback.technical_accuracy) : null;
        const vocalConfidence = clarity; // reuse clarity if available

        return {
            id: session.id,
            started_at: session.started_at,
            duration_minutes: session.duration_minutes,
            total_questions: session.total_questions,
            answered_questions: qa.length,
            overall_score: overall || 0,
            clarity: clarity || 0,
            responseSpeed: responseSpeed || 0,
            vocalConfidence: vocalConfidence || 0,
            aiFeedback: (feedback && (feedback.strengths || feedback.areas_of_improvement)) ? `Strengths: ${feedback.strengths || ''}. Areas: ${feedback.areas_of_improvement || ''}` : 'No detailed feedback available.',
            conversation: qa
        };
    }

    /* Transcript helper with speaker tagging */
    function appendTranscript(text, speaker = 'user') {
        const p = document.createElement('p');
        p.className = speaker === 'system' ? 'sys' : 'user';
        p.textContent = (speaker === 'system' ? 'System: ' : 'User: ') + text;
        transcriptEl.appendChild(p);
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
    }

    /* Handle a final user answer from recognition */
    async function handleFinalAnswer(text) {
        appendTranscript(text, 'user');
        try {
            if (serverMode && serverSessionId) {
                await sendAnswerToServer(serverSessionId, text);
            }
        } catch (err) {
            console.warn('Failed to send answer to server', err);
            // if server fails, fall back to local behavior
            serverMode = false;
            appendTranscript('Switched to local mode due to server error.', 'system');
        }
    }

    /* Send user answer to server and apply server response (next question & analysis) */
    async function sendAnswerToServer(sessionId, answer) {
        try {
            const res = await fetch('/api/interview/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: Number(sessionId), answer: String(answer) })
            });
            if (!res.ok) {
                if (res.status === 401) {
                    appendTranscript('Not authenticated. Server storage disabled for this session.', 'system');
                    serverMode = false;
                    return;
                }
                const txt = await res.text();
                appendTranscript('Server respond failed: ' + txt, 'system');
                return;
            }
            const data = await res.json();
            if (data && data.analysis) {
                appendTranscript(data.analysis, 'system');
            }
            if (data && data.nextQuestion) {
                // advance to next question and display it
                state.index = Math.min(state.index + 1, state.total - 1);
                state.questions[state.index] = data.nextQuestion;
                updateQuestion();
            }
        } catch (err) {
            console.error('Network error sending answer', err);
            appendTranscript('Network error while sending answer to server.', 'system');
            throw err;
        }
    }

    /* Build a summary from the current session for results and history */
    function buildSessionSummary() {
        const items = Array.from(transcriptEl.querySelectorAll('p'));
        const qa = [];
        // pair questions and user answers heuristically: system messages that are questions followed by user
        let lastQuestion = null;
        items.forEach(node => {
            const text = node.textContent.replace(/^System: |^User: /, '').trim();
            if (node.classList.contains('sys')) {
                // treat system messages that end with ? as question
                if (text.endsWith('?') || text.endsWith('.')) {
                    lastQuestion = text;
                }
            } else {
                if (lastQuestion) {
                    qa.push({ question: lastQuestion, answer: text });
                    lastQuestion = null;
                }
            }
        });

        const answered = qa.length;
        const total = state.total || answered;
        const durationMs = sessionStartTs ? (Date.now() - sessionStartTs) : 0;
        const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

        // Simple heuristics for scores (demo only)
        const avgWords = qa.reduce((acc, q) => acc + (q.answer.split(/\s+/).filter(Boolean).length || 0), 0) / Math.max(1, qa.length);
        const clarity = Math.min(98, Math.round(60 + avgWords * 2));
        const responseSpeed = Math.max(40, Math.min(98, Math.round(100 - (durationMinutes * 2))));
        const vocalConfidence = Math.min(95, Math.round((clarity + responseSpeed) / 2 + (Math.random() * 6 - 3)));
        const overall = Math.round((clarity * 0.45) + (vocalConfidence * 0.35) + (responseSpeed * 0.2));

        const aiFeedback = generateAIFeedback({ clarity, responseSpeed, vocalConfidence, overall, qa });

        return {
            id: 'local-' + Date.now(),
            started_at: sessionStartTs ? new Date(sessionStartTs).toISOString() : new Date().toISOString(),
            duration_minutes: durationMinutes,
            total_questions: total,
            answered_questions: answered,
            overall_score: overall,
            clarity, responseSpeed, vocalConfidence,
            aiFeedback,
            conversation: qa
        };
    }

    function generateAIFeedback({ clarity, responseSpeed, vocalConfidence, overall, qa }) {
        const suggestions = [];
        if (clarity < 70) suggestions.push('Work on clearer sentence structure and pausing between ideas.');
        else suggestions.push('Good clarity — keep structuring answers with a clear opening.');
        if (responseSpeed < 60) suggestions.push('Try to reduce long pauses; practice concise summaries.');
        if (vocalConfidence < 75) suggestions.push('Increase vocal energy and vary pitch to sound more confident.');
        return `Overall score ${overall}%. ${suggestions.join(' ')} Example strengths: ${Math.min(qa.length,3)} answers were on-topic.`;
    }

    function saveSessionToLocalHistory(summary) {
        try {
            const key = 'interview_history';
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            arr.unshift(summary);
            // keep only latest 50
            localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
        } catch (err) {
            console.warn('Failed to save session history locally', err);
        }
    }

    /* Results UI */
    const resultsScreen = document.getElementById('resultsScreen');
    const overallScoreEl = document.getElementById('overallScore');
    const metricClarityEl = document.getElementById('metricClarity');
    const metricResponseEl = document.getElementById('metricResponse');
    const metricConfidenceEl = document.getElementById('metricConfidence');
    const aiFeedbackEl = document.getElementById('aiFeedback');
    const resultsTranscriptEl = document.getElementById('resultsTranscript');
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const closeResultsBtn = document.getElementById('closeResultsBtn');

    function showResults(summary) {
        try {
            // populate
            overallScoreEl.textContent = summary.overall_score + '%';
            metricClarityEl.textContent = summary.clarity + '%';
            metricResponseEl.textContent = summary.responseSpeed + '%';
            metricConfidenceEl.textContent = summary.vocalConfidence + '%';
            aiFeedbackEl.textContent = summary.aiFeedback;

            // transcript
            resultsTranscriptEl.innerHTML = '';
            (summary.conversation || []).forEach(pair => {
                const q = document.createElement('p'); q.className = 'sys'; q.textContent = 'System: ' + pair.question; resultsTranscriptEl.appendChild(q);
                const a = document.createElement('p'); a.className = 'user'; a.textContent = 'User: ' + pair.answer; resultsTranscriptEl.appendChild(a);
            });

            // show results screen
            sessionScreen.classList.remove('active');
            resultsScreen.classList.add('active');
        } catch (err) {
            console.error('Failed to render results', err);
        }
    }

    if (saveSessionBtn) {
        saveSessionBtn.addEventListener('click', async () => {
            // Acknowledge saved locally (we already persisted to localStorage on end)
            appendTranscript('Session saved to local history.', 'system');
        });
    }

    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', () => {
            resultsScreen.classList.remove('active');
            setupScreen.classList.add('active');
        });
    }

    /* SpeechRecognition management */
    function startRecognition() {
        if (!SpeechRecognition) {
            appendTranscript('SpeechRecognition not supported in this browser. Use manual notes.', 'system');
            return;
        }

        // If already recording, do nothing
        if (isRecording) return;

        try {
            recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.continuous = true;

            recognition.onstart = () => {
                isRecording = true;
                retryCount = 0;
                showRecordingIndicator(true);
                updateRecordBtn(true);
                appendTranscript('Recording started...', 'system');
            };

            let interimTranscript = '';
            recognition.onresult = (event) => {
                interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const result = event.results[i];
                    const text = result[0].transcript.trim();
                    if (result.isFinal) {
                        handleFinalAnswer(text);
                    } else {
                        interimTranscript += text + ' ';
                    }
                }
                // show interim as system message temporarily
                updateInterim(interimTranscript);
            };

            recognition.onerror = (e) => {
                console.error('Recognition error', e.error);
                appendTranscript(`Recognition error: ${e.error}`, 'system');
                showRecordingIndicator(false);
                isRecording = false;
                try { recognition.stop(); } catch (err) { /* ignore */ }

                // Handle fatal permission/service errors without retry
                if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'security') {
                    appendTranscript('Microphone access is blocked — please enable permissions in the browser.', 'system');
                    showPermissionBanner('Microphone access is blocked. Allow microphone in your browser settings and retry.');
                    // do not attempt to restart
                    return;
                }

                // For network or timeout errors, attempt a small number of retries
                if (retryCount < MAX_RETRIES && state.running) {
                    retryCount += 1;
                    const delay = 700 * retryCount;
                    appendTranscript(`Retrying recognition (attempt ${retryCount})...`, 'system');
                    setTimeout(() => {
                        startRecognition();
                    }, delay);
                }
            };

            recognition.onend = () => {
                showRecordingIndicator(false);
                isRecording = false;
                updateRecordBtn(false);
                // if session still running, auto-restart after short delay to keep continuity
                if (state.running && retryCount === 0) {
                    setTimeout(() => {
                        startRecognition();
                    }, 300);
                }
            };

            recognition.start();
        } catch (err) {
            console.error('Failed to start recognition', err);
            appendTranscript('Microphone access denied or unavailable.', 'system');
        }
    }

    function stopRecognition(force = false) {
        if (!recognition) return;
        try {
            recognition.onresult = null;
            recognition.onend = null;
            recognition.onerror = null;
            recognition.stop();
        } catch (err) {
            // ignore
        }
        isRecording = false;
        showRecordingIndicator(false);
        updateRecordBtn(false);

        // if not forcing and session still running, allow auto-restart
        if (!force && state.running) {
            // leave it to onend to restart
        } else {
            recognition = null;
        }
    }

    function updateInterim(text) {
        // show interim results inline on the UI (not persisted)
        let tempEl = document.querySelector('.interim-temp');
        if (!tempEl) {
            tempEl = document.createElement('p');
            tempEl.className = 'interim-temp';
            tempEl.style.opacity = '0.7';
            tempEl.style.fontStyle = 'italic';
            transcriptEl.appendChild(tempEl);
        }
        tempEl.textContent = 'Listening... ' + (text || '');
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
        if (!text) {
            // remove after brief time
            setTimeout(() => { if (tempEl.parentNode) tempEl.parentNode.removeChild(tempEl); }, 1500);
        }
    }

    /* TTS */
    async function speakQuestion(text) {
        if (!synth) {
            appendTranscript('SpeechSynthesis not supported in this browser.', 'system');
            return;
        }

        // Cancel any previous utterances
        synth.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 1;
        utter.pitch = 1;

        // choose a matching voice if available
        let voices = synth.getVoices();
        // Some browsers populate voices asynchronously. Wait briefly if empty.
        if (!voices || voices.length === 0) {
            voices = await new Promise((resolve) => {
                const timer = setTimeout(() => {
                    resolve(synth.getVoices() || []);
                }, 350);
                const handler = () => {
                    clearTimeout(timer);
                    synth.removeEventListener('voiceschanged', handler);
                    resolve(synth.getVoices() || []);
                };
                synth.addEventListener('voiceschanged', handler);
            });
        }
        if (voices && voices.length) {
            const v = voices.find(v => /en(-|_)?us/i.test(v.lang)) || voices[0];
            if (v) utter.voice = v;
        }

        utter.onstart = () => {
            // when TTS starts, ensure recognition is running so we can capture reply
            // Some browsers may require stopping recognition while TTS is active; stop and restart afterwards
            if (isRecording && recognition) {
                try { recognition.stop(); } catch (e) {}
            }
        };

        utter.onend = () => {
            // restart recognition after speaking
            if (state.running) {
                // small delay to avoid echo
                setTimeout(() => {
                    startRecognition();
                }, 250);
            }
        };

        synth.speak(utter);
    }

    /* Recording indicator helper */
    function showRecordingIndicator(show) {
        recordingIndicator.style.display = show ? 'flex' : 'none';
        if (show) recordingIndicator.setAttribute('aria-live', 'polite');
        else recordingIndicator.removeAttribute('aria-live');

        // also toggle an active visual state on the record button if present
        if (recordBtn) {
            recordBtn.classList.toggle('active', !!show);
            recordBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
            recordBtn.textContent = show ? 'Stop Recording' : 'Start Recording';
        }
    }

    function updateRecordBtn(active) {
        if (!recordBtn) return;
        recordBtn.classList.toggle('active', !!active);
        recordBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        recordBtn.textContent = active ? 'Stop Recording' : 'Start Recording';
    }

    function capitalize(s) {
        return s.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');
    }
});
