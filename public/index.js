const ownerLabels = {
  anni: "Anni",
  johannes: "Johannes",
  shared: "Fælles"
};

loadWishlist();

async function loadWishlist() {
  const root = document.querySelector("#wishlist-root");
  root.innerHTML = `<article class="panel"><p>Henter ønsker...</p></article>`;

  const response = await fetch("/api/public", { cache: "no-store" });
  const data = await response.json();

  const owners = ["anni", "johannes", "shared"];
  root.innerHTML = owners
    .map((owner) => renderOwnerPanel(owner, data.wishes))
    .join("");
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
    <article class="wish-card">
      <h4>${escapeHtml(wish.title)}</h4>
      <div class="wish-meta">
        <span class="category-badge">${escapeHtml(wish.category)}</span>
      </div>
      ${
        wish.link
          ? `<div class="wish-actions"><a class="button-link secondary" href="${wish.link}" target="_blank" rel="noreferrer">Åbn link</a></div>`
          : ""
      }
    </article>
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
