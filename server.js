const express = require("express")

const app = express()
app.use(express.json({ limit: "1mb" }))
app.use("/public", express.static("public"))

const PORT = 8000


app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/index.html")
})

app.get('/teacher', (req, res) => {
    res.sendFile(__dirname + "/public/teacher.html")
})

app.get('/play', (req, res) => {
    res.sendFile(__dirname + "/public/play.html")
})

app.listen(PORT, () => {
    console.log(`Quiz server running on http://localhost:${PORT}`)
})
