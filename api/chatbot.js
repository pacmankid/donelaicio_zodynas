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

    const q = question.toLowerCase();

    // Filtruojame tik tuos įrašus, kuriuose vartotojo klausimas sutampa su senoviniu ar dabartiniu žodžiu
    const relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        return q.includes(senas) || q.includes(dabartinis);
    });

    if (relevant.length === 0) {
        return res.status(200).json({ answer: "Atsiprašau, neradau informacijos apie šį žodį." });
    }

    // Ribojame įrašų skaičių, kad promptas nebūtų per didelis
    const relevantLimited = relevant.slice(0, 3);

    // Siunčiame tik būtinus laukus DI
    const relevantData = relevantLimited.map(r => ({
        senovinis: r["Senovinis žodis"],
        dabartinis: r["Dabartinis žodis"],
        reiksme: r["Reikšmė"],
        pavyzdziai: r["Pavyzdiniai sakiniai"] || []
    }));

    const promptToDI = `
Vartotojas klausia: "${question}"

Radau duomenų bazės įrašą: ${JSON.stringify(relevantData)}

Instrukcijos DI modeliui:

- Jei klausimas yra apie žodį (senovinį arba dabartinį):
  Naudok tik šiuos duomenis.
  Pateik atsakymą tarsi dėstytojas kalbėtų su studentu: pastraipomis, įtraukiamai, natūraliai.
  Paaiškink žodžio reikšmę aiškiai lietuviškai, moksliškai tiksliai, bet suprantamai šiuolaikiniam skaitytojui.
  Pateik 2–3 pavyzdinius sakinius su senoviniu žodžiu, skirtingo tono: informatyvus, vaizdingas, kad padėtų įsiminti.

- Jei klausimas nėra apie žodį, bet susijęs su Konstantinu Sirvydu ar jo gyvenimu:
  Atsakyk draugiškai ir moksliniu tonu, pateik įdomių faktų ar kontekstą, tarsi dėstytojas papasakotų istoriją.

- Jei klausimas neatitinka nė vienos kategorijos:
  Atsakyk neutraliu, aiškiu stiliumi.

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
        console.log("OpenAI atsakymas:", data);

        const answer = data.choices?.[0]?.message?.content || "Įvyko klaida gaunant atsakymą";
        return res.status(200).json({ answer });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error", details: err.toString() });
    }
};
