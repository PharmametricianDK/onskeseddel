const ownerLabels = {
  anni: "Anni",
  johannes: "Johannes",
  shared: "Fælles"
};

const statusElement = document.querySelector("#claim-status");

loadWishlist();

async function loadWishlist() {
  const root = document.querySelector("#claim-root");
  root.innerHTML = `<article class="panel"><p>Henter ønsker...</p></article>`;

  const response = await fetch("/api/public", { cache: "no-store" });
  const data = await response.json();
  const owners = ["anni", "johannes", "shared"];

  root.innerHTML = owners
    .map((owner) => renderOwnerPanel(owner, data.wishes))
    .join("");

  root.querySelectorAll("[data-claim-button]").forEach((button) => {
    button.addEventListener("click", () => claimWish(button.dataset.wishId));
  });
}

function renderOwnerPanel(owner, wishes) {
  const relevant = wishes.filter((wish) => wish.owner === owner);

  return `
    <article class="panel">
      <div class="section-title">
        <h2>${ownerLabels[owner]}</h2>
        <span class="note">${relevant.length} ønsker</span>
      </div>
      ${
        relevant.length
          ? `<div class="wish-list">${relevant.map(renderWishCard).join("")}</div>`
          : `<p class="note">Ingen ønsker endnu.</p>`
      }
    </article>
  `;
}

function renderWishCard(wish) {
  return `
    <article class="wish-card ${wish.claimed ? "dimmed" : ""}">
      <h4>${escapeHtml(wish.title)}</h4>
      <div class="wish-meta">
        <span class="category-badge">${escapeHtml(wish.category)}</span>
      </div>
      <div class="wish-actions">
        ${
          wish.link
            ? `<a class="button-link secondary" href="${wish.link}" target="_blank" rel="noreferrer">Åbn link</a>`
            : ""
        }
        <button
          type="button"
          data-claim-button
          data-wish-id="${wish.id}"
          ${wish.claimed ? "disabled" : ""}
        >
          ${wish.claimed ? "Allerede valgt" : "Jeg køber denne"}
        </button>
      </div>
    </article>
  `;
}

async function claimWish(wishId) {
  const name = document.querySelector("#claimer-name").value.trim();
  if (!name) {
    setStatus("Skriv dit navn først.", true);
    document.querySelector("#claimer-name").focus();
    return;
  }

  setStatus("Gemmer valg...");

  const response = await fetch("/api/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ wishId, name })
  });

  if (!response.ok) {
    const data = await response.json();
    setStatus(data.error || "Noget gik galt.", true);
    await loadWishlist();
    return;
  }

  setStatus("Ønsket er nu markeret.");
  await loadWishlist();
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
