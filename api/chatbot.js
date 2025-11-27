import zodynas from '../data/zodynascsvjson.json';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    if (!apiKey || !question) {
        return res.status(400).json({ error: "Missing API key or prompt" });
    }

    // Filtruojame JSON įrašus pagal vartotojo klausimo žodžius
    const relevant = zodynas.filter(item => question.includes(item.seno_zodzio_forma));

    // Formuojame patobulintą prompt
    const prompt = `
Vartotojas klausia: "${question}".
Duomenų bazė (naudojami tik stulpeliai: senovinis_zodis, dabartine_forma, paaiskinimas): ${JSON.stringify(relevant)}

Užduotis DI API:
1. Jei yra duomenų, pateik atsakymą aiškiai taip:
   Senovinis žodis: ...
   Dabartinė forma: ...
   Paaiškinimas: ...
2. Jei paaiškinimas nėra dabartine bendrine lietuvių kalba, išversk jį į dabartinę lietuvių kalbą.
3. Jei duomenų nėra, atsakyk mandagiai: "Atsiprašau, neradau informacijos apie šį žodį."
4. Nerašyk nieko daugiau, tik atsakymą.
`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();

        // Paimame tik atsakymą iš DI API
        const answer = data.choices && data.choices[0]?.message?.content
            ? data.choices[0].message.content
            : "Įvyko klaida gaunant atsakymą";

        return res.status(200).json({ answer });

    } catch (error) {
        return res.status(500).json({ error: "Server error", details: error.toString() });
    }
}
