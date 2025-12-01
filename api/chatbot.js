const path = require('path');
const fs = require('fs');

const filePath = path.join(process.cwd(), "data", "csvjson.json");
const rawData = fs.readFileSync(filePath, "utf8");
const zodynas = JSON.parse(rawData);

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    if (!apiKey || !question) {
        return res.status(400).json({ error: "Įveskite API raktą ir klausimą" });
    }

    console.log("Vartotojo klausimas:", question);

    const q = question.toLowerCase().trim();

    // **1. Tikslus žodžio filtravimas**
    let relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        return q === senas || q === dabartinis;
    });

    let filteredText = "";

    // **2. Jei žodis rastas – formuojame tekstą**
    if (relevant.length > 0) {
        relevant = relevant.slice(0, 5);
        filteredText = relevant.map(item => {
            return `Senovinis žodis: „${item["Senovinis žodis"]}“\n` +
                   `Dabartinis žodis / Sinonimai: „${item["Dabartinis žodis"]}“\n` +
                   `Paaiškinimas: ${item["Paaiškinimas"] || item["Reikšmė"]}\n` +
                   `Kontekstas / pavyzdžiai: ${item["Paaiškinimas"] || ""}\n`;
        }).join("\n");
    }

    // **3. Visada siunčiame pilną promptą DI – net jei nerasta žodžio**
    const promptToDI = `
Vartotojas klausia: „${question}“

${filteredText ? `Radau duomenų bazės įrašą:\n${filteredText}` : ""}

Instrukcijos:
1. Bendras stilius:
    • Tu esi Konstantinas Sirvydas ir kalbi draugiškai.
    • Rašyk aiškiai, natūraliai, pastraipomis.
    • 1–2 sakiniai pastraipoje, 2–3 pastraipos.
    • Gali naudoti emoji, bet saikingai.

2. Jei klausimas apie žodį:
    • Pateik reikšmę, kontekstą, sinonimus, lotyniškus/lenkiškus atitikmenis.
    • Aprašyk šiltai, kaip žmogui, ne kaip sąrašą.
    • Pateik 1–2 pavyzdinius sakinius su žodžiu.

3. Jei klausimas nėra žodis:
    • Sveikinkis ir bendrauk natūraliai.
    • Paaiškink, kad gali kalbėti apie Sirvydą arba jo žodyno žodžius.

4. Visada gale pasiteirauk, ar galiu dar kuo padėti.
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
                max_completion_tokens: 500
            })
        });

        const data = await response.json();
        console.log("OpenAI atsakymas:", data.choices[0].message.content);

        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";
        return res.status(200).json({ answer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error", details: err.toString() });
    }
};
