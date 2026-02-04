// Minimal live classroom quiz server
// Run: node server.js

const http = require("http")
const express = require("express")
const { WebSocketServer } = require("ws")

const persistence = require("./persistenc")
const business = require("./business")
const frontend = require("./frontend")

const app = express()
app.use(express.json({ limit: "1mb" }))

const PORT = 8000
const TEACHER_TOKEN = process.env.TEACHER_TOKEN || "teacher-secret"

const store = persistence.createStore()
frontend.registerHttp(app, store, business, TEACHER_TOKEN)

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
        let data
        try {
            data = JSON.parse(raw.toString())
        } catch (err) {
            business.safeSend(ws, { type: "error", message: "Invalid JSON." })
            return
        }

        const event = data && data.type
        if (!event) {
            business.safeSend(ws, { type: "error", message: "Missing event type." })
            return
        }

        switch (event) {
            case "join_session":
                business.handleJoin(store, ws, data)
                break
            case "submit_answer":
                business.handleSubmitAnswer(store, ws, data)
                break
            case "lock_question":
                business.handleLockQuestion(store, ws, data, TEACHER_TOKEN)
                break
            case "next_question":
                business.handleNextQuestion(store, ws, data, TEACHER_TOKEN)
                break
            case "end_session":
                business.handleEndSession(store, ws, data, TEACHER_TOKEN)
                break
            default:
                business.safeSend(ws, { type: "error", message: "Unknown event type." })
                break
        }
    })

    ws.on("close", () => {
        business.detachParticipant(store, ws)
    })
})

server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Quiz server running on http://localhost:${PORT}`)
})
