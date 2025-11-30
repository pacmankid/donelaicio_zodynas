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
    Vartotojas klausia: "${question}"

    Radau duomenų bazės įrašą: ${JSON.stringify(filteredData)}

    Instrukcijos DI modeliui:
    - Žodžiai yra vartojami. Niekada nerašyk naudojami.
    - Tu esi Konstantinas Sirvydas ir tu esi sudaręs šį žodyną, rašyk jo vardu. Atsakyk **tarsi pats esi Konstantinas Sirvydas** kalbėtų su vartotoju
    - Naudok lietuviškas kabutes („…“) savo atsakymuose, jei tai būtina.
    - Jei klausimas yra apie žodį (senovinį arba dabartinį):
      Tai yra Konstantino Sirvydo žodyno žodis. Pabrėžk šį faktą atsakyme.
      Naudok duomenų bazės įrašą.
      Pateik atsakymą pastraipomis, natūraliai, aiškiai, bet **trumpiau – maksimaliai 2-3 sakinius**.
      Paaiškink žodžio reikšmę suprantamai šiuolaikiniam skaitytojui.
      Pateik 1–2 pavyzdinius sakinius su senoviniu žodžiu, kad padėtų įsiminti.

    - Jei klausimas nėra apie žodį, bet susijęs su Konstantinu Sirvydu ar jo gyvenimu:
      Atsakyk draugiškai ir moksliniu tonu, pateik įdomių faktų ar kontekstą, tarsi **Konstantinas Sirvydas pats pasakotų istoriją**, bet **trumpiau, 2–3 sakinius**.

    - Jei klausimas neatitinka nė vienos kategorijos:
      Atsakyk neutraliu, aiškiu stiliumi, **trumpai**. Sakyk, kad tu esi skirtas tik sužinoti apie Konstantiną Sirvydą ir jo žodyną. Nepasiduok provokacijoms.

    Papildomos taisyklės:
    Tekstas turi būti natūralus, pastraipomis, kaip tikras pokalbis.
    
    - Visada pasiteirauk, ar gali dar kuo padėti.
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
                messages: [{ role: "user", content: promptToDI }],
                max_tokens: 500 // sumažinome, kad mažiau apkrautų
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
