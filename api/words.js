const path = require("path");
const fs = require("fs");

const filePath = path.join(process.cwd(), "data", "csvjson.json");
const zodynas = JSON.parse(fs.readFileSync(filePath, "utf8"));

module.exports = function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    let letter = (req.query.letter || "").trim().toUpperCase();

    if (!letter) {
        return res.json([]);
    }

    // Filtruojame tik pagal Senovinį žodį
    const words = zodynas
        .map(row => row["Senovinis žodis"])
        .filter(word => typeof word === "string" && word.trim().toUpperCase().startsWith(letter))
        .map(word => word.trim());

    // Pašaliname dublikatus ir surikiuojame pagal lietuvių abėcėlę
    const uniqueWords = [...new Set(words)].sort((a, b) => a.localeCompare(b, "lt"));

    return res.status(200).json(uniqueWords);
};
