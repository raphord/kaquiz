const express = require("express")

const app = express()
app.use(express.json({ limit: "1mb" }))

const PORT = 8000


app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/index.html")
})

app.listen(PORT, () => {
    console.log(`Quiz server running on http://localhost:${PORT}`)
})
