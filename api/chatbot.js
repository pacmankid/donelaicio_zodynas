import zodynas from '../data/zodynascsvjson.json';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, prompt: question } = req.body;

    if (!apiKey || !question) {
        return res.status(400).json({ error: "Missing API key or prompt" });
    }

    // Filtruojame JSON įrašus, kuriuose yra vartotojo klausimo žodžiai
    const relevant = zodynas.filter(item => question.includes(item.seno_zodzio_forma));

    // Formuojame prompt, kad DI API galėtų panaudoti JSON duomenis
    const prompt = `
Vartotojas klausia: "${question}".
Duomenų bazė: ${JSON.stringify(relevant)}
Atsakyk kaip chatbot, naudodamas šią informaciją.
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
