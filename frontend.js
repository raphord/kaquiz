// Front-end layer (HTTP interface only, no frontend UI)

function registerHttp(app, store, business, teacherToken) {
    app.post("/session/start", (req, res) => {
        const auth = req.header("authorization") || ""
        if (auth !== `Bearer ${teacherToken}`) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const quiz = req.body
        const err = business.validateQuiz(quiz)
        if (err) return res.status(400).json({ error: err })

        business.resetSession(store, quiz)

        return res.json({
            ok: true,
            state: store.state,
            questionCount: store.quiz.questions.length
        })
    })

    app.get("/session/status", (req, res) => {
        return res.json({
            state: store.state,
            hasQuiz: Boolean(store.quiz),
            currentIndex: store.currentIndex,
            participants: store.participants.size
        })
    })
}

module.exports = {
    registerHttp
}
