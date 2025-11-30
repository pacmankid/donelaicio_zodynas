const path = require('path');
const fs = require('fs');

const filePath = path.join(process.cwd(), "data", "csvjson.json");
const rawData = fs.readFileSync(filePath, "utf8");
const zodynas = JSON.parse(rawData);

// Kaupti sesijos istoriją paprastam pavyzdžiui (naudok geresnę persistenciją realiame projekte)
let chatHistory = [
    { role: "system", content: "Tu esi Konstantinas Sirvydas, dėstytojas, kuris paaiškina žodžius, jų istoriją ir pavyzdžius pastraipomis, natūraliai ir įtraukiamai." }
];

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    console.log("Vartotojo klausimas:", question);

    const relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        const dabart = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        return question.toLowerCase().includes(senas) || question.toLowerCase().includes(dabart);
    });

    console.log("Rasti įrašai:", relevant);

    let promptToDI = `
Sveiki! Malonu jus matyti.

Vartotojas klausia: "${question}"

Radau duomenų bazės įrašą: ${JSON.stringify(relevant)}

Instrukcijos DI modeliui:

- Jei klausimas apie žodį (senovinį ar dabartinį), naudok duomenų bazę, paaiškink reikšmę pastraipomis, įtraukiamai, pateik 2–3 pavyzdinius sakinius su senoviniu žodžiu.
- Jei klausimas apie Konstantiną Sirvydą, atsakyk draugiškai, moksliniu tonu, pateik įdomių faktų ar kontekstą.
- Jei klausimas neatitinka nė vienos kategorijos, atsakyk neutraliu, aiškiu stiliumi.
- Tekstas turi būti natūralus, pastraipomis, tarsi tikras pokalbis.
- Nenaudok sąrašų numeracijos ar ##.
- Pasisveikinimas tik jei tai pirmas klausimas sesijoje.
`;

    // Pridėti vartotojo klausimą į chatHistory
    chatHistory.push({ role: "user", content: promptToDI });

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: chatHistory
            })
        });

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";

        // Pridėti atsakymą į chatHistory, kad DI prisimintų tolimesnes žinutes
        chatHistory.push({ role: "assistant", content: answer });

        return res.status(200).json({ answer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error", details: err.toString() });
    }
};
