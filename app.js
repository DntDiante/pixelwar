// 🔥 Remplace avec TA config Firebase ici :
const firebaseConfig = {
  apiKey: "TA_CLE_API",
  authDomain: "ton-projet.firebaseapp.com",
  projectId: "ton-projet",
  storageBucket: "ton-projet.appspot.com",
  messagingSenderId: "XXX",
  appId: "XXX"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth listener
auth.onAuthStateChanged(async user => {
  if (user && window.location.pathname.includes("index.html")) {
    const userDoc = await db.collection("users").doc(user.uid).get();
    const data = userDoc.data();
    document.getElementById("welcome").textContent = `Bienvenue ${data.pseudo} - Team ${data.country}`;
    generateGrid(user.uid, data.country);
  } else if (!user && window.location.pathname.includes("index.html")) {
    window.location.href = "login.html";
  }
});

// Form signup
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pseudo = document.getElementById("pseudo").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const country = document.getElementById("country").value;

    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection("users").doc(cred.user.uid).set({
      pseudo, email, country,
      lastPixel: null
    });
    window.location.href = "index.html";
  });
}

// Log out
const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut();
    window.location.href = "login.html";
  });
}

// Generate 20x20 grid
async function generateGrid(userId, teamColor) {
  const grid = document.getElementById("grid");
  const warMeta = await db.collection("meta").doc("war").get();
  const start = new Date(warMeta.data().startDate);
  const duration = warMeta.data().durationDays;
  const now = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + duration);

  const countdown = document.getElementById("countdown");
  const remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  countdown.textContent = `⏳ Jours restants avant fin de guerre : ${remainingDays}`;

  if (now > end) {
    alert("⛔ La guerre est terminée !");
    return;
  }

  for (let i = 0; i < 400; i++) {
    const pixel = document.createElement("div");
    pixel.className = "pixel";
    pixel.dataset.index = i;

    pixel.addEventListener("click", async () => {
      const userDoc = await db.collection("users").doc(userId).get();
      const last = userDoc.data().lastPixel;
      const today = new Date().toDateString();

      if (last === today) {
        alert("Tu as déjà posé un pixel aujourd'hui !");
        return;
      }

      pixel.style.backgroundColor = teamColorToColor(teamColor);
      pixel.classList.add("taken");
      await db.collection("pixels").doc(`${i}`).set({ owner: userId, team: teamColor });
      await db.collection("users").doc(userId).update({ lastPixel: today });
    });

    db.collection("pixels").doc(`${i}`).get().then(doc => {
      if (doc.exists) {
        const team = doc.data().team;
        pixel.style.backgroundColor = teamColorToColor(team);
        pixel.classList.add("taken");
      }
    });

    grid.appendChild(pixel);
  }
}

function teamColorToColor(team) {
  switch (team) {
    case "france": return "blue";
    case "germany": return "black";
    case "japan": return "red";
    case "usa": return "green";
    default: return "white";
  }
}

if (window.location.pathname.includes("stats.html")) {
  db.collection("pixels").get().then(snapshot => {
    const counts = { france: 0, germany: 0, japan: 0, usa: 0 };
    let total = 0;

    snapshot.forEach(doc => {
      const team = doc.data().team;
      if (counts[team] !== undefined) {
        counts[team]++;
        total++;
      }
    });

    const container = document.getElementById("stats");
    container.innerHTML = `<h3>Total de pixels posés : ${total}</h3>`;

    for (const team in counts) {
      const percent = total > 0 ? ((counts[team] / total) * 100).toFixed(1) : 0;
      container.innerHTML += `
        <p><strong>${team.toUpperCase()}</strong> : ${counts[team]} pixels (${percent}%)</p>
      `;
    }

    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    container.innerHTML += `<h2>🏆 En tête : ${winner.toUpperCase()}</h2>`;
  });
}