/* Snout Lab calculator v1.3 logic.
   Safety tables are the SnoutLab v0.22.2 lists from the 2026-09-30 capture.
   Fuzzy "did you mean" matching is not in this file.
   The full cut ledger is not in this file. Meal type changes the day's split,
   and known plants count only on B.A.R.F.
   Fee is rate times hours. Nothing on the page types the dollar amount.
   Pack prices are the 2026-09-27 price file, per pack. A live fetch of that
   file fails the publish gate, so this snapshot is what the page paints. */
  const TOXIC_FOODS = {
    "chocolate": "chocolate", "cocoa": "chocolate", "cacao": "chocolate",
    "onion": "onions", "onions": "onions", "shallot": "onions", "shallots": "onions",
    "leek": "onions", "leeks": "onions", "chive": "onions", "chives": "onions",
    "grape": "grapes", "grapes": "grapes", "raisin": "raisins", "raisins": "raisins",
    "sultana": "raisins", "sultanas": "raisins", "currant": "raisins", "currants": "raisins",
    "garlic": "garlic", "avocado": "avocado", "avocados": "avocado",
    "macadamia": "macadamia nuts", "macadamias": "macadamia nuts", "macadamia nuts": "macadamia nuts",
    "xylitol": "xylitol", "birch sugar": "xylitol",
    "alcohol": "alcohol", "beer": "alcohol", "wine": "alcohol", "liquor": "alcohol",
    "caffeine": "caffeine", "coffee": "caffeine", "espresso": "caffeine", "tea": "caffeine (in tea)",
    "nutmeg": "nutmeg", "mushroom": "wild mushrooms", "mushrooms": "wild mushrooms",
    "yeast dough": "raw yeast dough", "raw dough": "raw yeast dough", "bread dough": "raw yeast dough",
    "poppy seed": "poppy seeds", "poppy seeds": "poppy seeds",
    "rhubarb": "rhubarb", "rhubarb leaves": "rhubarb",
  };
  const CAUTION_FOODS = {
    "raw potato": "raw potato \u2014 solanine; cook potato through before feeding (sweet potato is a different plant and is fine)",
    "raw potatoes": "raw potato \u2014 solanine; cook potato through before feeding (sweet potato is a different plant and is fine)",
    "green potato": "green/sprouted potato \u2014 high solanine, discard rather than feed",
    "sprouted potato": "green/sprouted potato \u2014 high solanine, discard rather than feed",
    "potato skin": "potato skins \u2014 solanine concentrates in the skin, cook them through and skip any green or sprouted ones",
    "potato skins": "potato skins \u2014 solanine concentrates in the skin, cook them through and skip any green or sprouted ones",
    "tomato plant": "tomato leaves/stems/unripe fruit \u2014 solanine, ripe flesh only",
    "green tomato": "tomato leaves/stems/unripe fruit \u2014 solanine, ripe flesh only",
    "tomato leaves": "tomato leaves/stems/unripe fruit \u2014 solanine, ripe flesh only",
    "almond": "almonds \u2014 choking/GI obstruction risk, avoid flavored/salted",
    "almonds": "almonds \u2014 choking/GI obstruction risk, avoid flavored/salted",
    "walnut": "walnuts \u2014 can grow toxic mold, plus GI obstruction risk",
    "walnuts": "walnuts \u2014 can grow toxic mold, plus GI obstruction risk",
    "pistachio": "pistachios \u2014 high fat (pancreatitis risk), shells are a choking hazard",
    "pistachios": "pistachios \u2014 high fat (pancreatitis risk), shells are a choking hazard",
    "cashew": "cashews \u2014 high fat (pancreatitis risk) in large amounts",
    "cashews": "cashews \u2014 high fat (pancreatitis risk) in large amounts",
    "bacon": "bacon \u2014 high fat/salt, pancreatitis risk in excess",
    "tuna": "tuna \u2014 mercury accumulates; occasional only, not a staple fish",
    "salt": "salt \u2014 sodium ion poisoning risk in large amounts",
    "cherry": "cherries \u2014 pit/stem contain cyanogenic compounds, flesh is fine",
    "cherries": "cherries \u2014 pit/stem contain cyanogenic compounds, flesh is fine",
    "apple seeds": "apple seeds \u2014 cyanogenic, core the apple; the flesh is fine",
    "apple seed": "apple seeds \u2014 cyanogenic, core the apple; the flesh is fine",
    "peach pit": "stone-fruit pits \u2014 cyanogenic plus obstruction risk, flesh is fine",
    "apricot pit": "stone-fruit pits \u2014 cyanogenic plus obstruction risk, flesh is fine",
    "plum pit": "stone-fruit pits \u2014 cyanogenic plus obstruction risk, flesh is fine",
    "mustard seed": "mustard seed \u2014 GI irritant, not a BARF seed",
    "mustard seeds": "mustard seed \u2014 GI irritant, not a BARF seed",
    "watermelon seeds": "watermelon seeds \u2014 obstruction risk in quantity, seedless flesh is fine",
    "cooked bone": "cooked bones \u2014 splinter into shards, obstruction/perforation risk (raw bones are fine)",
    "cooked bones": "cooked bones \u2014 splinter into shards, obstruction/perforation risk (raw bones are fine)",
    "corn on the cob": "corn on the cob \u2014 classic obstruction hazard, corn kernels alone are fine",
    "corn cob": "corn on the cob \u2014 classic obstruction hazard, corn kernels alone are fine",
    "wild boar": "wild boar \u2014 parasite risk (e.g. trichinella) unless properly frozen first, cook-adjacent handling advised",
    "venison": "venison/wild game \u2014 parasite risk unless commercially frozen per USDA guidance before raw feeding",
    "deer": "venison/wild game \u2014 parasite risk unless commercially frozen per USDA guidance before raw feeding",
    "elk": "elk/wild game \u2014 parasite risk unless commercially frozen per USDA guidance before raw feeding",
    "squirrel": "squirrel/small wild game \u2014 parasite risk, not a typical raw-feeding ingredient",
    "wild hare": "wild hare \u2014 parasite risk unless properly sourced/frozen, similar to other wild game",
    // Xylitol carriers (safety ruling 2026-08-24). TOXIC_FOODS catches
    // "xylitol" and "birch sugar" -- the additive's own names, which nobody types.
    // It reaches a dog inside a product, and the product is what a person names
    // when they list the fridge, so "sugar-free peanut butter" tripped nothing at
    // all. CAUTION, not TOXIC, on purpose: these foods MAY carry the additive and
    // only the label settles it. Flagging peanut butter as toxic would be false,
    // and would train a reader to dismiss the flags that are not.
    //
    // The sugar-free phrases carry most of the weight -- xylitol's whole market is
    // sugar-free product lines, so they cover gum, yogurt, baked goods and things
    // nobody has thought of yet; the named carriers below are a second net. Both
    // spellings are required: "sugar free" does not match "sugar-free", and the
    // hyphen is what is printed on the jar.
    //
    // Plain, greek and unqualified yogurt are deliberately absent. Plain greek is
    // unsweetened by default, and flagging it would false-positive on the exact
    // product most people actually use. This is about an additive in some
    // products, not about dairy.
    "sugar free": "sugar-free products \u2014 the main way xylitol reaches a dog; check the label for xylitol or birch sugar before feeding any of it",
    "sugar-free": "sugar-free products \u2014 the main way xylitol reaches a dog; check the label for xylitol or birch sugar before feeding any of it",
    "no sugar added": "sugar-free products \u2014 the main way xylitol reaches a dog; check the label for xylitol or birch sugar before feeding any of it",
    "diet ": "sugar-free products \u2014 the main way xylitol reaches a dog; check the label for xylitol or birch sugar before feeding any of it",
    "flavored yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "flavoured yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "sweetened yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "vanilla yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "strawberry yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "blueberry yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "peach yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "fruit yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "fruit-on-the-bottom yogurt": "flavored/sweetened yogurt \u2014 can carry xylitol and added sugar; plain unsweetened only, and check the label",
    "peanut butter": "peanut butter \u2014 most brands are fine, but reduced-sugar and sugar-free versions can contain xylitol; check the label",
    "peanutbutter": "peanut butter \u2014 most brands are fine, but reduced-sugar and sugar-free versions can contain xylitol; check the label",
    "peanut-butter": "peanut butter \u2014 most brands are fine, but reduced-sugar and sugar-free versions can contain xylitol; check the label",
    "gum": "gum and breath mints \u2014 frequently xylitol-sweetened; keep well out of reach, an ingestion is an emergency-vet call",
    "chewing gum": "gum and breath mints \u2014 frequently xylitol-sweetened; keep well out of reach, an ingestion is an emergency-vet call",
    "breath mint": "gum and breath mints \u2014 frequently xylitol-sweetened; keep well out of reach, an ingestion is an emergency-vet call",
    "breath mints": "gum and breath mints \u2014 frequently xylitol-sweetened; keep well out of reach, an ingestion is an emergency-vet call",
  };

const CONFIG = { ratePerHour: 40, hours: { igp: 1.5, ipo: 3, schutzhund: 7 } };
const GRAM = 453.59237;
const OZ = 28.349523125;
/* prices.json generated 2026-09-27T01:31:21. Live rows only. Not food tiers. */
const PACKS = [
  { name: "The Meat Whip", pack: "3 lb", price: 4.79, note: "Muscle and ground bone. A topper or a base." },
  { name: "The Meat Whip", pack: "5 lb", price: 5.79, note: "A topper or a base." },
  { name: "Meat Whip Plus", pack: "3 lb", price: 4.99, note: "The Whip, plus chia and vegetable trim." },
  { name: "Meat Whip Plus", pack: "5 lb", price: 6.19, note: "The Whip, plus chia and vegetable trim." },
  { name: "Rib bones", pack: "3-pack", price: 7, note: "Added to a week, not the gram fill." },
  { name: "Rib bones", pack: "6-pack", price: 13, note: "Added to a week, not the gram fill." }
];

function tokens(text) {
  return text.toLowerCase().match(/[a-z]+/g) || [];
}
function flagsFor(name) {
  const text = name.toLowerCase();
  const toxic = new Set();
  const caution = new Set();
  Object.keys(TOXIC_FOODS).forEach((key) => {
    if (key.includes(" ") && text.includes(key)) toxic.add(TOXIC_FOODS[key]);
  });
  Object.keys(CAUTION_FOODS).forEach((key) => {
    if (key.includes(" ") && text.includes(key)) caution.add(CAUTION_FOODS[key]);
  });
  tokens(text).forEach((word) => {
    if (word in TOXIC_FOODS && !TOXIC_FOODS_KEY_HAS_SPACE(word)) toxic.add(TOXIC_FOODS[word]);
    else if (word in CAUTION_FOODS && !String(word).includes(" ")) caution.add(CAUTION_FOODS[word]);
  });
  return { toxic: [...toxic], caution: [...caution] };
}
function TOXIC_FOODS_KEY_HAS_SPACE(word) { return false; }

const MEAL = {
  PMR: [
    ["Muscle", 80], ["Bone", 10], ["Liver", 5], ["Other organ", 5],
    ["Vegetable", 0], ["Seed", 0], ["Fruit", 0]
  ],
  BARF: [
    ["Muscle", 70], ["Bone", 10], ["Liver", 5], ["Other organ", 5],
    ["Vegetable", 7], ["Seed", 2], ["Fruit", 1]
  ]
};
const PLANTS = [
  "carrots", "carrot", "sweet potato", "sweet potatoes", "yam", "parsnip", "parsnips",
  "turnip", "turnips", "rutabaga", "beets", "beet", "radish", "radishes", "kohlrabi",
  "celeriac", "pumpkin", "pumpkin puree", "squash", "butternut squash", "acorn squash",
  "spaghetti squash", "delicata squash", "zucchini", "yellow squash", "cucumber", "cucumbers",
  "broccoli", "broccoli stems", "cauliflower", "cabbage", "red cabbage", "brussels sprouts",
  "brussel sprouts", "bok choy", "kohlrabi greens", "spinach", "kale", "collard greens",
  "collards", "collard stems", "collard stalks", "swiss chard", "chard", "romaine",
  "romaine lettuce", "lettuce", "arugula", "watercress", "dandelion greens", "beet greens",
  "turnip greens", "mustard greens", "leafy greens", "green beans", "green bean", "peas",
  "green peas", "snap peas", "snow peas", "sugar snap peas", "corn", "sweet corn", "celery",
  "asparagus", "bell pepper", "bell peppers", "red bell pepper", "green bell pepper", "okra",
  "artichoke", "artichoke hearts", "fennel", "fennel bulb", "cold-press vegetable pulp",
  "vegetable pulp", "psyllium husk", "psyllium", "chia seeds", "chia seed", "chia",
  "flaxseed", "flax seed", "flax seeds", "ground flaxseed", "flax", "linseed",
  "hemp seeds", "hemp seed", "hemp hearts", "pumpkin seeds", "pumpkin seed",
  "sunflower seeds", "sunflower seed", "sesame seeds", "sesame seed", "milk thistle",
  "milk thistle seed", "milk thistle seeds", "basil seeds", "basil seed", "sabja",
  "squash seeds", "squash seed", "butternut squash seeds", "fennel seed", "fennel seeds",
  "celery seed", "celery seeds", "coriander seed", "coriander seeds", "caraway seed",
  "caraway seeds", "quinoa", "amaranth", "buckwheat", "buckwheat groats", "millet",
  "sorghum", "teff", "kelp", "kelp powder", "spirulina", "chlorella", "dulse", "nori",
  "blueberries", "blueberry", "apple", "banana", "strawberries", "strawberry",
  "raspberries", "raspberry", "blackberries", "blackberry", "watermelon", "cantaloupe",
  "mango", "pear", "cranberries", "cranberry"
];

function isPlant(name) {
  const text = name.toLowerCase();
  const words = tokens(text);
  return PLANTS.some((key) => key.includes(" ") ? text.includes(key) : words.includes(key) || text === key);
}

const fridge = [];
const needEl = document.getElementById("weight");
const pctEl = document.getElementById("pct");
const customPct = document.getElementById("custom-pct");
const nameEl = document.getElementById("ing-name");
const ozEl = document.getElementById("ing-oz");
const listEl = document.getElementById("fridge");
const dailyEl = document.getElementById("daily");
const coverEl = document.getElementById("covered");
const gapEl = document.getElementById("gap");
const splitEl = document.getElementById("split");
const levelHint = document.getElementById("level-hint");
const mealHint = document.getElementById("meal-hint");
const summaryName = document.getElementById("summary-name");
const summaryDetail = document.getElementById("summary-detail");
const barGrams = document.getElementById("bar-grams");
const barDay = document.getElementById("bar-day-detail");
const packList = document.getElementById("packs");
const part2 = document.getElementById("part2");

let plan = "ipo";
let freq = "Every 4 Weeks";
let level = "2.5";
let meal = "PMR";

function fee(key) {
  return CONFIG.ratePerHour * CONFIG.hours[key];
}
function money(n) {
  return "$" + (Number.isInteger(n) ? String(n) : n.toFixed(2));
}
function readNum(el, fallback) {
  const n = Number(el.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function percentUsed() {
  if (level === "custom") return readNum(pctEl, 2.5);
  return Number(level);
}
function paintFridge() {
  listEl.replaceChildren();
  let animal = 0;
  let plant = 0;
  fridge.forEach((item, index) => {
    const li = document.createElement("li");
    if (item.toxic.length) li.className = "bad";
    else if (item.caution.length) li.className = "warn";
    const title = document.createElement("strong");
    title.textContent = item.name + " · " + item.oz + " oz";
    li.append(title);
    if (item.toxic.length) {
      const p = document.createElement("p");
      p.textContent = "Left out of the count. " + item.toxic.join(" ");
      li.append(p);
    } else if (item.plant && meal === "PMR") {
      const p = document.createElement("p");
      p.textContent = "Set aside. P.M.R. is animal only.";
      li.append(p);
    } else {
      const grams = item.oz * OZ;
      if (item.plant) plant += grams;
      else animal += grams;
      if (item.caution.length) {
        const p = document.createElement("p");
        p.textContent = item.caution.join(" ");
        li.append(p);
      }
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ctrl quiet";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => { fridge.splice(index, 1); paint(); });
    li.append(btn);
    listEl.append(li);
  });
  return { animal, plant };
}
function paintSplit(daily) {
  splitEl.replaceChildren();
  const rows = MEAL[meal].map(([name, pct]) => [name, daily ? Math.round(daily * pct / 100) : 0]);
  if (daily) {
    const sum = rows.reduce((total, row) => total + row[1], 0);
    rows[0][1] += Math.round(daily) - sum;
  }
  rows.forEach(([name, grams]) => {
    const li = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = name + " ";
    li.append(strong);
    li.append(daily ? grams.toLocaleString() + " g" : "—");
    splitEl.append(li);
  });
}
function paintPacks() {
  packList.replaceChildren();
  PACKS.forEach((item) => {
    const li = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = item.name + ", " + item.pack;
    const price = document.createElement("span");
    price.className = "pack-price";
    price.textContent = Number.isFinite(item.price) ? "$" + item.price.toFixed(2) : "—";
    const note = document.createElement("span");
    note.className = "pack-note";
    note.textContent = item.note;
    li.append(name, price, note);
    packList.append(li);
  });
}
function paint() {
  const lb = readNum(needEl, 0);
  const pct = percentUsed();
  const daily = lb * GRAM * (pct / 100);
  const sides = paintFridge();
  const covered = sides.animal + sides.plant;
  const gap = Math.max(0, daily - covered);
  const dayText = lb ? Math.round(daily).toLocaleString() + " g" : "—";
  dailyEl.textContent = dayText;
  barGrams.textContent = dayText;
  coverEl.textContent = Math.round(covered).toLocaleString() + " g";
  gapEl.textContent = lb ? Math.round(gap).toLocaleString() + " g" : "—";
  paintSplit(lb ? daily : 0);
  customPct.hidden = level !== "custom";
  const levelName = level === "3.5" ? "Puppy / active" : level === "1.5" ? "Senior / less active" : level === "custom" ? "Custom" : "Adult standard";
  levelHint.textContent = levelName + " is " + pct + "% of body weight a day. That percent is worked out here.";
  mealHint.textContent = meal === "PMR"
    ? "P.M.R. is animal only. Muscle 80, bone 10, liver 5, other organ 5."
    : "B.A.R.F. holds 10% of the day for plants. Muscle 70, bone 10, liver 5, other organ 5, vegetable 7, seed 2, fruit 1.";
  barDay.textContent = levelName + " · " + (meal === "PMR" ? "P.M.R." : "B.A.R.F.");
  document.querySelectorAll("[data-level]").forEach((btn) => {
    const on = btn.getAttribute("data-level") === level;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  document.querySelectorAll("[data-meal]").forEach((btn) => {
    const on = btn.getAttribute("data-meal") === meal;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const dollars = fee(plan);
  const label = plan === "igp" ? "IGP" : plan === "ipo" ? "IPO" : "Schutzhund";
  summaryName.textContent = label + " · " + money(dollars) + "/mo";
  summaryDetail.textContent = freq + " · " + CONFIG.hours[plan] + " h · " + money(CONFIG.ratePerHour) + "/h · the seat, not the bag";
  document.querySelectorAll("[data-plan]").forEach((btn) => {
    const on = btn.getAttribute("data-plan") === plan;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const key = btn.getAttribute("data-plan");
    const name = key === "igp" ? "IGP" : key === "ipo" ? "IPO" : "Schutzhund";
    btn.textContent = name + " · " + money(fee(key)) + "/mo";
  });
  document.querySelectorAll("[data-freq]").forEach((btn) => {
    const on = btn.getAttribute("data-freq") === freq;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
document.querySelectorAll("[data-plan]").forEach((btn) => {
  btn.addEventListener("click", () => { plan = btn.getAttribute("data-plan"); paint(); });
});
document.querySelectorAll("[data-freq]").forEach((btn) => {
  btn.addEventListener("click", () => { freq = btn.getAttribute("data-freq"); paint(); });
});
document.querySelectorAll("[data-level]").forEach((btn) => {
  btn.addEventListener("click", () => { level = btn.getAttribute("data-level"); paint(); });
});
document.querySelectorAll("[data-meal]").forEach((btn) => {
  btn.addEventListener("click", () => { meal = btn.getAttribute("data-meal"); paint(); });
});
function addIngredient() {
  const name = nameEl.value.trim();
  const oz = Number(ozEl.value);
  if (!name || !Number.isFinite(oz) || oz < 0) return;
  const flagged = flagsFor(name);
  fridge.push({ name, oz, toxic: flagged.toxic, caution: flagged.caution, plant: isPlant(name) });
  nameEl.value = "";
  ozEl.value = "";
  paint();
}
document.getElementById("add-ing").addEventListener("click", addIngredient);
[nameEl, ozEl].forEach((el) => {
  el.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addIngredient();
  });
});
document.getElementById("cuts").addEventListener("click", () => {
  part2.hidden = false;
});
needEl.addEventListener("input", paint);
pctEl.addEventListener("input", paint);
const q = new URLSearchParams(location.search);
if (q.has("lb")) needEl.value = q.get("lb");
if (q.has("level") && ["3.5", "2.5", "1.5", "custom"].includes(q.get("level"))) level = q.get("level");
if (q.has("meal") && (q.get("meal") === "PMR" || q.get("meal") === "BARF")) meal = q.get("meal");
if (q.has("pct")) pctEl.value = q.get("pct");
paintPacks();
paint();
