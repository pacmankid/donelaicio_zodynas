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

    // Patikriname, ar klausimas atitinka žodžius duomenų bazėje
    const relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        const q = question.toLowerCase();
        return q.includes(senas) || q.includes(dabartinis);
    });

    // Pirmas pasisveikinimas tik jei header nenurodytas arba 'true'
    const firstMessageHeader = req.headers['x-first-message'];
    const firstMessage = firstMessageHeader === undefined || firstMessageHeader === 'true';

    const promptToDI = `
${firstMessage ? 'Sveiki! Aš Konstantinas Sirvydas. Malonu jus matyti.' : ''}

Vartotojas klausia: "${question}"

${relevant.length > 0 ? `Radau duomenų bazės įrašą: ${JSON.stringify(relevant)}` : ''}

Instrukcijos DI modeliui:

- Jei klausimas apie žodį, naudok duomenų bazę, paaiškink kaip dėstytojas pasako studentui: natūraliai, įtraukiamai, pastraipomis, su 2–3 pavyzdiniais sakiniais, pateik senovinius žodžius ir jų reikšmes.
- Jei klausimas apie Konstantiną Sirvydą, atsakyk draugiškai ir įdomiai, tarsi istoriją pasakotum.
- Jei klausimas neatitinka nė vienos kategorijos, atsakyk neutraliu stiliumi.

Tekstas turi būti natūralus, pastraipomis, kaip tikras pokalbis.
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
        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";
        return res.status(200).json({ answer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error", details: err.toString() });
    }
};
