// In-memory persistence layer
// NOTE: This is intentionally simple so it can be swapped to MongoDB later

function createStore() {
    return {
        state: "waiting", // waiting | question | locked | ended
        quiz: null, // { title, questions: [{ text, options: [string], correctIndex? }] }
        currentIndex: -1,
        participants: new Map(), // participantId -> { name, ws, connectedAt }
        answers: new Map() // participantId -> { answerIndex, answeredAt }
    }
}

module.exports = {
    createStore
}
