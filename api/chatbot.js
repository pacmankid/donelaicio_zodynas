<!DOCTYPE html>
<html lang="lt" class="dark">
<head>
    <meta charset="UTF-8" />
    <title>Sirvydo žodynas</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class'
        }
    </script>
</head>

<body class="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

<div class="max-w-5xl mx-auto p-4">

    <!-- HEADER -->
    <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Sirvydo žodynas</h1>
        <button id="toggleTheme" class="px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded">
            🌙 / ☀️
        </button>
    </div>

    <!-- API KEY -->
    <input id="apiKey"
           placeholder="Įveskite DI API raktą"
           class="w-full mb-4 p-2 rounded bg-white dark:bg-gray-800 border dark:border-gray-700"/>

    <!-- ABĖCĖLĖ -->
    <div id="alphabet" class="flex flex-wrap gap-2 mb-6"></div>

    <!-- ŽODŽIAI -->
    <div id="words" class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6"></div>

    <!-- PAAIŠKINIMAS -->
    <div id="explanation"
         class="hidden bg-white dark:bg-gray-800 p-4 rounded shadow text-sm leading-relaxed"></div>

</div>

<script>
const alphabetDiv = document.getElementById("alphabet");
const wordsDiv = document.getElementById("words");
const explanationDiv = document.getElementById("explanation");
const apiKeyInput = document.getElementById("apiKey");

/* DARK MODE */
document.getElementById("toggleTheme")
    .addEventListener("click", () =>
        document.documentElement.classList.toggle("dark")
    );

/* ABĖCĖLĖ */
const letters = "AĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ".split("");

letters.forEach(letter => {
    const btn = document.createElement("button");
    btn.textContent = letter;
    btn.className = "px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 hover:text-white";
    btn.onclick = () => loadWords(letter);
    alphabetDiv.appendChild(btn);
});

/* UŽKRAUNAM ŽODŽIUS */
async function loadWords(letter) {
    wordsDiv.innerHTML = "Kraunama...";
    explanationDiv.classList.add("hidden");

    const res = await fetch(`/api/words?letter=${letter}`);
    const data = await res.json();

    wordsDiv.innerHTML = "";

    data.forEach(word => {
        const btn = document.createElement("button");
        btn.textContent = word;
        btn.className = "text-left p-2 bg-white dark:bg-gray-800 rounded hover:bg-blue-100 dark:hover:bg-gray-700";
        btn.onclick = () => explainWord(word);
        wordsDiv.appendChild(btn);
    });
}

/* PAAIŠKINIMAS */
async function explainWord(word) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Įveskite API raktą");
        return;
    }

    explanationDiv.classList.remove("hidden");
    explanationDiv.innerHTML = "Sirvydas mąsto…";

    const res = await fetch("/api/explain", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ apiKey, word })
    });

    const data = await res.json();
    explanationDiv.innerHTML = data.answer.replace(/\n/g, "<br>");
}
</script>

</body>
</html>
