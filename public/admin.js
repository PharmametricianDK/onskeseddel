const ownerLabels = {
  anni: "Anni",
  johannes: "Johannes",
  shared: "Fælles"
};

const statusElement = document.querySelector("#admin-status");
const categoryForm = document.querySelector("#category-form");
const wishForm = document.querySelector("#wish-form");
const resetButton = document.querySelector("#reset-button");
const categorySelect = document.querySelector("#wish-category");

categoryForm.addEventListener("submit", handleCategorySubmit);
wishForm.addEventListener("submit", handleWishSubmit);
resetButton.addEventListener("click", handleReset);

loadAdmin();

async function loadAdmin() {
  const root = document.querySelector("#admin-root");
  root.innerHTML = `<article class="panel"><p>Henter admin-data...</p></article>`;

  const response = await fetch("/api/admin", { cache: "no-store" });
  if (!response.ok) {
    root.innerHTML = `<article class="panel"><p>Login kræves for at åbne admin-siden.</p></article>`;
    return;
  }

  const data = await response.json();
  updateCategoryOptions(data.categories);
  renderAdmin(data);
}

function updateCategoryOptions(categories) {
  categorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
    .join("");
}

function renderAdmin(data) {
  const root = document.querySelector("#admin-root");
  const owners = ["anni", "johannes", "shared"];

  root.innerHTML = owners
    .map((owner) => {
      const wishes = data.wishes.filter((wish) => wish.owner === owner);

      return `
        <article class="panel">
          <div class="section-title">
            <h2>${ownerLabels[owner]}</h2>
            <span class="note">${wishes.length} ønsker</span>
          </div>
          ${
            wishes.length
              ? `<div class="wish-list">${wishes.map(renderWishCard).join("")}</div>`
              : `<p class="note">Ingen ønsker endnu.</p>`
          }
        </article>
      `;
    })
    .join("");

  root.querySelectorAll("[data-toggle-received]").forEach((button) => {
    button.addEventListener("click", () =>
      toggleReceived(button.dataset.wishId, button.dataset.received !== "true")
    );
  });
}

function renderWishCard(wish) {
  return `
    <article class="wish-card">
      <h4>${escapeHtml(wish.title)}</h4>
      <div class="wish-meta">
        <span class="category-badge">${escapeHtml(wish.category)}</span>
        ${wish.received ? '<span class="received-badge">Modtaget</span>' : ""}
      </div>
      <div class="wish-actions">
        ${
          wish.link
            ? `<a class="button-link secondary" href="${wish.link}" target="_blank" rel="noreferrer">Åbn link</a>`
            : ""
        }
        <button
          type="button"
          class="secondary"
          data-toggle-received
          data-wish-id="${wish.id}"
          data-received="${wish.received}"
        >
          ${wish.received ? "Markér som ikke modtaget" : "Markér som modtaget"}
        </button>
      </div>
    </article>
  `;
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  const formData = new FormData(categoryForm);
  const name = `${formData.get("name") || ""}`.trim();

  if (!name) {
    setStatus("Skriv et kategorinavn.", true);
    return;
  }

  setStatus("Gemmer kategori...");
  const response = await fetch("/api/admin/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  await handleAdminRefresh(response, "Kategori gemt.");
  categoryForm.reset();
}

async function handleWishSubmit(event) {
  event.preventDefault();
  const formData = new FormData(wishForm);
  const payload = {
    owner: formData.get("owner"),
    category: formData.get("category"),
    title: `${formData.get("title") || ""}`.trim(),
    link: `${formData.get("link") || ""}`.trim()
  };

  if (!payload.title) {
    setStatus("Skriv et ønske.", true);
    return;
  }

  setStatus("Gemmer ønske...");
  const response = await fetch("/api/admin/wishes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  await handleAdminRefresh(response, "Ønske tilføjet.");
  wishForm.reset();
}

async function handleReset() {
  setStatus("Nulstiller valgte ønsker...");
  const response = await fetch("/api/admin/reset-claims", {
    method: "POST"
  });

  await handleAdminRefresh(response, "Alle ikke-modtagne ønsker er genåbnet.");
}

async function toggleReceived(wishId, received) {
  setStatus("Opdaterer ønske...");
  const response = await fetch(`/api/admin/wishes/${wishId}/received`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ received })
  });

  await handleAdminRefresh(
    response,
    received ? "Ønsket er markeret som modtaget." : "Ønsket er åbnet igen."
  );
}

async function handleAdminRefresh(response, successMessage) {
  if (!response.ok) {
    const data = await response.json();
    setStatus(data.error || "Noget gik galt.", true);
    return;
  }

  const data = await response.json();
  updateCategoryOptions(data.categories);
  renderAdmin(data);
  setStatus(successMessage);
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

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
