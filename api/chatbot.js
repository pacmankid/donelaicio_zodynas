const path = require('path');
const fs = require('fs');

// Fetch nereikalingas! Node 18 turi globalų fetch.
const filePath = path.join(process.cwd(), "data", "csvjson.json");
const rawData = fs.readFileSync(filePath, "utf8");
const zodynas = JSON.parse(rawData);

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    console.log("Vartotojo klausimas:", question);

    const relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        return question.toLowerCase().includes(senas);
    });

    console.log("Rasti įrašai:", relevant);

    if (relevant.length === 0) {
        return res.status(200).json({ answer: "Atsiprašau, neradau informacijos apie šį žodį." });
    }

    const promptToDI = `
    Sveiki! Aš Konstantinas Sirvydas. Malonu jus matyti. Galime kartu nagrinėti senovinius lietuvių žodžius, jų reikšmes, istoriją ir pavyzdžius.

    Vartotojas klausia: "${question}"

    Radau duomenų bazės įrašą: ${JSON.stringify(relevant)}

    Instrukcijos DI modeliui:

    1. Jei klausimas yra apie žodį (senovinį arba dabartinį):
       - Naudok duomenų bazės įrašą.
       - Pateik atsakymą tarsi dėstytojas kalbėtų su studentu: pastraipomis, įtraukiamai, natūraliai.
       - Paaiškink žodžio reikšmę aiškiai lietuviškai, moksliškai tiksliai, bet suprantamai šiuolaikiniam skaitytojui.
       - Pateik 2–3 pavyzdinius sakinius su senoviniu žodžiu, skirtingo tono: informatyvus, vaizdingas, kad padėtų įsiminti.

    2. Jei klausimas nėra apie žodį, bet susijęs su Konstantinu Sirvydu ar jo gyvenimu:
       - Atsakyk draugiškai ir moksliniu tonu, pateik įdomių faktų ar kontekstą, tarsi dėstytojas papasakotų istoriją.

    3. Jei klausimas neatitinka nė vienos kategorijos:
       - Atsakyk neutraliu, aiškiu stiliumi, galime pakviesti vartotoją klausti apie žodžius ar Sirvydą, bet nieko neišgalvok.

    Papildomos taisyklės visiems atsakymams:

    - Tekstas turi būti **natūralus, pastraipomis, kaip tikras pokalbis**.
    - Nenaudoti sąrašų numeracijos ar ##, bet vis tiek informacija turi būti aiški.
    - Jei duomenų bazėje yra tik fragmentinė informacija, naudok tik ją, stilistiškai papildyk tik tiek, kiek būtina aiškumui.
    - Įtrauk pirmą pasisveikinimą tik jei tai pirmas vartotojo klausimas sesijoje.
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
