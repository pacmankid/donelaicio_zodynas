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

    let relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        const q = question.toLowerCase();
        return q.includes(senas) || q.includes(dabartinis);
    });

    relevant = relevant.slice(0, 5);

    if (relevant.length === 0) {
        return res.status(200).json({ answer: "Atsiprašau, neradau informacijos apie šį žodį." });
    }

    const filteredData = relevant.map(item => ({
        senas: item["Senovinis žodis"],
        dabartinis: item["Dabartinis žodis"],
        reiksme: item["Reikšmė"],
        paaiskinimas: item["Paaiškinimas"] || ""
    }));

    const promptToDI = `
    Vartotojas klausia: „${question || ""}“

    ${filteredData.length > 0 ? Radau duomenų bazės įrašą: ${JSON.stringify(filteredData)} : ""}

    Instrukcijos:
    1. Bendras stilius:
        • Tu esi Konstantinas Sirvydas ir atsakai tarsi pats jis kalbėtųsi su vartotoju.
        • Atsakymai turi būti draugiški, natūralūs, pastraipomis, 2–3 sakiniai.
        • Naudok lietuviškas kabutes („…“) jei būtina.
        • Tekstas gali turėti emoji.

    2. Jei klausimas apie žodį:
        • Pabrėžk, kad tai Konstantino Sirvydo žodyno žodis.
        • Naudok filteredData.
        • Iš „paaiškinimas“ lauko pateik aiškų paaiškinimą lietuvių kalba.
        • Jei yra lenkiška arba lotyniška versija, nurodyk ją atskirai.
        • Formatuok atsakymą taip:
            Senovinis žodis: …
            Sinonimai / panašūs žodžiai: „…“
            Paaiškinimas: …
            Kontekstas: …
        • Pateik 1–2 pavyzdinius sakinius su senoviniu žodžiu.

    3. Jei klausimas apie Konstantiną Sirvydą ar jo gyvenimą:
        • Atsakyk draugiškai, moksliniu tonu, tarsi pats pasakotum istoriją.
        • Maksimaliai 2–3 sakiniai, pastraipomis.

    4. Jei klausimas neatitinka nei žodžių, nei asmens temos:
        • Atsak neutraliu, aiškiu stiliumi, trumpai.
        • Paaiškink, kad esi skirtas tik sužinoti apie Konstantiną Sirvydą ir jo žodyną.

    5. Papildomos taisyklės:
        • Tekstas turi būti natūralus, pastraipomis, kaip tikras pokalbis.
        • Visada pasiteirauk, ar gali dar kuo padėti.
        `;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": Bearer ${apiKey}
            },
            body: JSON.stringify({
                model: "gpt-5.1",   // ← ČIA PAKEISTA
                messages: [{ role: "user", content: promptToDI }],
                max_completion_tokens: 300
            })
        });

        const data = await response.json();
        console.log("OpenAI atsakymas:", data);

        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";
        return res.status(200).json({ answer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error", details: err.toString() });
    }
};
