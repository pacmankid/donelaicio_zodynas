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
    Vartotojas klausia: "${question}"
    Radau duomenų bazės įrašą: ${JSON.stringify(relevant)}

    Pateik informaciją taip, kad ji būtų moksliškai tiksli, aiški ir kartu įtraukianti. 
    Atpažink vartotojo klausimą tiek pagal senovinį, tiek pagal dabartinį žodį. 
    Jeigu vartotojas pateikia dabartinį žodį – pateik senovinį atitikmenį, ir atvirkščiai.

    Atsakyme privalomai pateik:

    1. **Senovinis žodis**  
    2. **Dabartinis žodis**  
    3. **Paaiškinimas lietuviškai**  
       – išversk arba perrašyk taip, kad būtų suprantama šiuolaikiniam skaitytojui, išlaikant mokslinį tikslumą.  
    4. **Reikšmė**  
    5. **2–3 pavyzdiniai sakiniai**  
       – panaudok *senovinį žodį* natūraliame kontekste;  
       – sakiniai gali būti skirtingo tono: vienas informatyvesnis, kitas labiau vaizdingas, kad padėtų įsiminti.

    Jei duomenų bazėje yra tik fragmentinė informacija, naudok tik ją, nieko neišgalvodamas faktais, 
    o stilistiškai papildyk tik tiek, kiek būtina aiškumui.
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
