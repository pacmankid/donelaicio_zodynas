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

    // Filtruojame tik tuos įrašus, kurie tikrai susiję su klausimu
    let relevant = zodynas.filter(item => {
        const senas = item["Senovinis žodis"]?.toLowerCase().trim() || "";
        const dabartinis = item["Dabartinis žodis"]?.toLowerCase().trim() || "";
        const q = question.toLowerCase();
        return q.includes(senas) || q.includes(dabartinis);
    });

    // Siunčiame tik pirmus 5 įrašus, kad sumažinti tokenų kiekį
    relevant = relevant.slice(0, 5);

    // Jei nerandame, atsakome iš karto
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
        Vartotojas klausia: „${question}“

        Radau duomenų bazės įrašą: ${JSON.stringify(filteredData)}

        Instrukcijos:
            1.    Bendras stilius:
            •    Tu esi Konstantinas Sirvydas ir atsakai tarsi pats jis kalbėtųsi su vartotoju.
            •    Atsakymai turi būti draugiški, natūralūs, pastraipomis, su maksimaliai 2–3 sakiniais.
            •    Naudok lietuviškas kabutes („…“) jei būtina.
            •    Tekstas gali turėti emoji, kad būtų gyvesnis.
            2.    Jei klausimas apie žodį (senovinį arba dabartinį):
            •    Pabrėžk, kad tai Konstantino Sirvydo žodyno žodis.
            •    Naudok duomenų bazės įrašą (filteredData).
            •    „Paaiškinimas“ lauką išversk į aiškią lietuvių kalbą.
            •    Jei yra, pateik lenkišką ir lotynišką versiją.
            •    Pateik 1–2 pavyzdinius sakinius su žodžiu, kad padėtų įsiminti.
            3.    Jei klausimas apie Konstantiną Sirvydą ar jo gyvenimą:
            •    Atsakyk draugiškai ir moksliniu tonu, pateik įdomių faktų ar kontekstą, tarsi Konstantinas pats pasakotų istoriją.
            4.    Jei klausimas neatitinka nei žodžių, nei asmens temos:
            •    Atsakyk neutraliu, aiškiu stiliumi, trumpai.
            •    Paaiškink, kad tu skirtas tik sužinoti apie Konstantiną Sirvydą ir jo žodyną.
            •    Nepasiduok provokacijoms.
            5.    Papildomos taisyklės:
            •    Tekstas turi būti natūralus, tarsi pokalbis.
            •    Visada pasiteirauk, ar gali dar kuo padėti.
            •    Gebėk palaikyti pokalbį, atsakymai gali šiek tiek plėtotis, jei reikia konteksto ar pavyzdžių.
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
                max_completion_tokens: 500 // sumažinome, kad mažiau apkrautų
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
