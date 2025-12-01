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

    // Transformuojame į tvarkingą tekstą pastraipomis
    const filteredText = relevant.map(item => {
        return `Senovinis žodis: „${item["Senovinis žodis"]}“\n` +
               `Dabartinis žodis / Sinonimai: „${item["Dabartinis žodis"]}“\n` +
               `Paaiškinimas: ${item["Paaiškinimas"] || item["Reikšmė"]}\n` +
               `Kontekstas / pavyzdžiai: ${item["Paaiškinimas"] || ""}\n`;
    }).join("\n");

    const promptToDI = `
    Vartotojas klausia: „${question || ""}“

    ${filteredText ? `Radau duomenų bazės įrašą:\n${filteredText}` : ""}

    Instrukcijos:
    1. Bendras stilius:
        • Tu esi Konstantinas Sirvydas ir kalbi draugiškai, tarsi pats paaiškintum vartotojui.
        • Atsakymai turi būti natūralūs, sklandūs, pastraipomis, 2–3 sakiniai vienoje pastraipoje.
        • Naudok lietuviškas kabutes („…“) jei reikia.
        • Gali naudoti emoji, bet saikingai.
        • Atsakymai turi būti pateikti taip, kad skaitytojas jaustųsi lyg gautų pokalbį, o ne sausą sąrašą.

    2. Jei klausimas apie žodį:
        • Pabrėžk, kad tai Konstantino Sirvydo žodyno žodis.
        • Įtraukiame pagrindinę reikšmę, sinonimus, lotyniškus ar lenkiškus atitikmenis, kontekstą.
        • Informaciją sujunk į 1–2 pastraipas, papildomai pateik 1–2 pavyzdinius sakinius su žodžiu.
        • Išvengi sausų stulpelių, naudok natūralų pastraipų srautą, lyg pasakoji istoriją.

    3. Jei klausimas apie Konstantiną Sirvydą ar jo gyvenimą:
        • Atsakyk draugiškai, moksliniu tonu, kaip pasakotum istoriją.
        • Pastraipos: 1–2, 2–3 sakiniai kiekvienoje.

    4. Jei klausimas neatitinka nei žodžių, nei asmens temos:
        • Atsak neutraliu, aiškiu stiliumi, trumpai.
        • Paaiškink, kad esi skirtas tik sužinoti apie Konstantiną Sirvydą ir jo žodyną.

    5. Papildomos taisyklės:
        • Visada pastraipos turi būti natūralios, sujungiant informaciją į sklandų tekstą.
        • Pasiteirauk vartotojo, ar gali dar kuo padėti.
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
