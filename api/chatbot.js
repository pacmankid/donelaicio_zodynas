const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

// 🔧 Nuskaitome tavo csvjson.json failą
const filePath = path.join(process.cwd(), "data", "csvjson.json");
const rawData = fs.readFileSync(filePath, "utf8");
const zodynas = JSON.parse(rawData);

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    if (!apiKey || !question) {
        return res.status(400).json({ error: "Missing API key or prompt" });
    }

    console.log("Vartotojo klausimas:", question);

    // 🔍 Filtras pagal tikslų stulpelio pavadinimą: "Senovinis žodis"
    const relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toString().toLowerCase().trim() || "";
        return question.toLowerCase().includes(senas);
    });

    console.log("Rasti įrašai:", relevant);

    if (relevant.length === 0) {
        return res.status(200).json({ answer: "Atsiprašau, neradau informacijos apie šį žodį." });
    }

    const promptToDI = `
Vartotojas klausia: "${question}".

Radau šiuos įrašus iš duomenų bazės:

${JSON.stringify(relevant)}

Atsakyk aiškiai ir struktūruotai:
1. Senovinis žodis
2. Dabartinis žodis
3. Paaiškinimas (dabartine lietuvių kalba)
4. Reikšmė
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
        console.log("OpenAI atsakymas:", data);

        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";
        return res.status(200).json({ answer });

    } catch (error) {
        console.error("DI API klaida:", error);
        return res.status(500).json({ error: "Server error", details: error.toString() });
    }
};
