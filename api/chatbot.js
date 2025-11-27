const zodynas = require('../data/zodynascsvjson.json');

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    if (!apiKey || !question) {
        return res.status(400).json({ error: "Missing API key or prompt" });
    }

    const relevant = zodynas.filter(item =>
        question.toLowerCase().includes(item.seno_zodzio_forma.toLowerCase().trim())
    );

    console.log("Vartotojo klausimas:", question);
    console.log("Rasti JSON įrašai:", relevant);

    if (relevant.length === 0) {
        return res.status(200).json({ answer: "Atsiprašau, neradau informacijos apie šį žodį." });
    }

    const promptToDI = `
Vartotojas klausia: "${question}".
Duomenų bazė: ${JSON.stringify(relevant)}

Atsakyk aiškiai:
1. Senovinis žodis
2. Dabartinė forma
3. Paaiškinimas (išverstas į dabartinę lietuvių kalbą)
`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: promptToDI }]
            })
        });

        const data = await response.json();

        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";

        return res.status(200).json({ answer });

    } catch (error) {
        console.error("DI API klaida:", error);
        return res.status(500).json({ error: "Server error", details: error.toString() });
    }
}
