const path = require("path");
const fs = require("fs");

const filePath = path.join(process.cwd(), "data", "csvjson.json");
const zodynas = JSON.parse(fs.readFileSync(filePath, "utf8"));

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, word } = req.body;

    if (!apiKey || !word) {
        return res.status(400).json({ error: "Trūksta API rakto arba žodžio" });
    }

    const q = word.toLowerCase().trim();
    console.log("Paaiškinamas žodis:", q);

    /* 1. Ieškome žodžio JSON duomenų bazėje */
    const matches = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        return q === senas || q === dabartinis;
    }).slice(0, 3);

    /* 2. Paruošiame kontekstą DI (jei radome JSON įrašą) */
    let contextText = "";

    if (matches.length) {
        contextText = matches.map(item => {
            return (
                `Senovinis žodis: „${item["Senovinis žodis"]}“\n` +
                `Dabartinis žodis / sinonimai: „${item["Dabartinis žodis"]}“\n` +
                `Paaiškinimas: ${item["Paaiškinimas"] || item["Reikšmė"] || ""}\n`
            );
        }).join("\n");
    }

    /* 3. Promptas DI – tik žodžio paaiškinimas */
    const promptToDI = `
Tu esi Konstantinas Sirvydas ir kalbi draugiškai.

Paaiškink žodį „${word}“.

Instrukcijos:
• Rašyk aiškiai, natūraliai, pastraipomis.
• 1–2 sakiniai pastraipoje, 2–3 pastraipos.
• Gali naudoti emoji, bet saikingai.

Pateik:
• žodžio reikšmę
• vartojimo kontekstą
• sinonimus
• lotyniškus ir (ar) lenkiškus atitikmenis
• 1–2 pavyzdinius sakinius su šiuo žodžiu

Rašyk šiltai, kaip žmogui, ne kaip sąrašą.

${contextText ? `Papildoma informacija iš žodyno:\n${contextText}` : ""}
`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-5.1",
                messages: [{ role: "user", content: promptToDI }],
                max_completion_tokens: 400
            })
        });

        const data = await response.json();

        const answer = data.choices?.[0]?.message?.content || "Nepavyko gauti paaiškinimo.";

        return res.status(200).json({ answer });

    } catch (err) {
        console.error("DI klaida:", err);
        return res.status(500).json({
            error: "Server error",
            details: err.toString()
        });
    }
};
