// Business logic layer

function nowIso() {
    return new Date().toISOString()
}

function makeParticipantId() {
    return `p_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function safeSend(ws, payload) {
    if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload))
    }
}

function broadcast(store, payload, exceptWs = null) {
    for (const { ws } of store.participants.values()) {
        if (ws && ws !== exceptWs && ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(payload))
        }
    }
}

function validateQuiz(quiz) {
    if (!quiz || typeof quiz !== "object") return "Quiz must be an object."
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        return "Quiz must include a non-empty questions array."
    }
    for (let i = 0; i < quiz.questions.length; i += 1) {
        const q = quiz.questions[i]
        if (!q || typeof q !== "object") return `Question ${i} must be an object.`
        if (typeof q.text !== "string" || q.text.trim() === "") {
            return `Question ${i} must include non-empty text.`
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
            return `Question ${i} must include at least 2 options.`
        }
        if (q.options.some((opt) => typeof opt !== "string" || opt.trim() === "")) {
            return `Question ${i} has invalid option(s).`
        }
    }
    return null
}

function resetSession(store, quiz) {
    store.state = "waiting"
    store.quiz = quiz
    store.currentIndex = -1
    store.answers.clear()
}

function getCurrentQuestion(store) {
    if (!store.quiz) return null
    if (store.currentIndex < 0 || store.currentIndex >= store.quiz.questions.length) {
        return null
    }
    const q = store.quiz.questions[store.currentIndex]
    return {
        index: store.currentIndex,
        text: q.text,
        options: q.options
    }
}

function handleJoin(store, ws, data) {
    const name = typeof data.name === "string" ? data.name.trim() : ""
    if (!name) {
        safeSend(ws, { type: "error", message: "Name is required." })
        return
    }

    let participantId = typeof data.participantId === "string" ? data.participantId : null
    if (participantId && store.participants.has(participantId)) {
        const participant = store.participants.get(participantId)
        participant.ws = ws
        participant.connectedAt = nowIso()
    } else {
        participantId = makeParticipantId()
        store.participants.set(participantId, {
            name,
            ws,
            connectedAt: nowIso()
        })
    }

    safeSend(ws, {
        type: "joined",
        participantId,
        state: store.state,
        question: getCurrentQuestion(store)
    })
}

function handleSubmitAnswer(store, ws, data) {
    if (store.state !== "question") {
        safeSend(ws, { type: "error", message: "Question is not open." })
        return
    }
    const participantId = typeof data.participantId === "string" ? data.participantId : null
    if (!participantId || !store.participants.has(participantId)) {
        safeSend(ws, { type: "error", message: "Invalid participant." })
        return
    }
    if (store.answers.has(participantId)) {
        safeSend(ws, { type: "error", message: "Answer already submitted." })
        return
    }
    const answerIndex = data.answerIndex
    const question = getCurrentQuestion(store)
    if (!question) {
        safeSend(ws, { type: "error", message: "No active question." })
        return
    }
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
        safeSend(ws, { type: "error", message: "Invalid answer index." })
        return
    }

    store.answers.set(participantId, { answerIndex, answeredAt: nowIso() })
    safeSend(ws, { type: "answer_accepted", participantId, answerIndex })
}

function requireTeacher(data, teacherToken) {
    return data && data.teacherToken === teacherToken
}

function handleLockQuestion(store, ws, data, teacherToken) {
    if (!requireTeacher(data, teacherToken)) {
        safeSend(ws, { type: "error", message: "Unauthorized teacher action." })
        return
    }
    if (store.state !== "question") {
        safeSend(ws, { type: "error", message: "No open question to lock." })
        return
    }
    store.state = "locked"
    broadcast(store, { type: "state", state: store.state })
}

function handleNextQuestion(store, ws, data, teacherToken) {
    if (!requireTeacher(data, teacherToken)) {
        safeSend(ws, { type: "error", message: "Unauthorized teacher action." })
        return
    }
    if (!store.quiz) {
        safeSend(ws, { type: "error", message: "No quiz loaded." })
        return
    }
    if (store.state === "ended") {
        safeSend(ws, { type: "error", message: "Session has ended." })
        return
    }

    const nextIndex = store.currentIndex + 1
    if (nextIndex >= store.quiz.questions.length) {
        store.state = "ended"
        broadcast(store, { type: "state", state: store.state })
        return
    }

    store.currentIndex = nextIndex
    store.state = "question"
    store.answers.clear()
    broadcast(store, { type: "question", question: getCurrentQuestion(store), state: store.state })
}

function handleEndSession(store, ws, data, teacherToken) {
    if (!requireTeacher(data, teacherToken)) {
        safeSend(ws, { type: "error", message: "Unauthorized teacher action." })
        return
    }
    store.state = "ended"
    broadcast(store, { type: "state", state: store.state })
}

function detachParticipant(store, ws) {
    for (const participant of store.participants.values()) {
        if (participant.ws === ws) {
            participant.ws = null
            break
        }
    }
}

module.exports = {
    validateQuiz,
    resetSession,
    getCurrentQuestion,
    handleJoin,
    handleSubmitAnswer,
    handleLockQuestion,
    handleNextQuestion,
    handleEndSession,
    detachParticipant,
    safeSend
}
