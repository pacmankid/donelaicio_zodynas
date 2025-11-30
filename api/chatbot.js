const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const filePath = path.join(process.cwd(), "data", "csvjson.json");
const rawData = fs.readFileSync(filePath, "utf8");
const zodynas = JSON.parse(rawData);

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Patikriname, kad body egzistuotų
    const { apiKey, prompt: question } = req.body || {};

    if (!apiKey || !question) {
        return res.status(400).json({ error: "Missing API key or prompt" });
    }

    console.log("Vartotojo klausimas:", question);

    const relevant = zodynas.filter(item => {
        const senas = item["seno-zodzio-forma"] || item.seno_zodzio_forma || item.senas || "";
        return question.toLowerCase().includes(senas.toLowerCase().trim());
    });

    console.log("Rasti įrašai:", relevant);

    if (relevant.length === 0) {
        return res.status(200).json({ answer: "Atsiprašau, neradau informacijos apie šį žodį." });
    }

    const promptToDI = `
Vartotojas klausia: "${question}".
Radau šiuos įrašus: ${JSON.stringify(relevant)}

Atsakyk aiškiai:
1. Senovinis žodis
2. Dabartinė forma
3. Paaiškinimas dabartine lietuvių kalba
`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: promptToDI }]
            })
        });

        const data = await response.json();
        const answer = data?.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";

        return res.status(200).json({ answer });

    } catch (error) {
        console.error("DI API klaida:", error);
        return res.status(500).json({ error: "Server error", details: error.toString() });
    }
};
