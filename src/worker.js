const DATA_KEY = "wishlist.json";

const DEFAULT_CATEGORIES = ["Tøj/Sko", "Køkken mv.", "Bøger", "Personlig"];

const DEFAULT_WISHES = [
  {
    owner: "anni",
    category: "Personlig",
    title: "Parfume"
  },
  {
    owner: "anni",
    category: "Køkken mv.",
    title: "Georg Jensen Damask Nors karklude"
  },
  {
    owner: "anni",
    category: "Personlig",
    title: "Reelight RL720 cykellygter",
    link: "https://cykelgear.dk/tilbehor/lygter/cykellygter/lygtesaet-reelight-rl-720"
  },
  {
    owner: "anni",
    category: "Tøj/Sko",
    title: "Birkenstock sandaler str. 38"
  },
  {
    owner: "anni",
    category: "Bøger",
    title: "Ulrikka Lagerlöf: Multebærmosen"
  },
  {
    owner: "anni",
    category: "Bøger",
    title: "Martha Hall Kelly: Bogklubben på Marthas Vineyard"
  },
  {
    owner: "johannes",
    category: "Køkken mv.",
    title: "Olivenudstener"
  },
  {
    owner: "johannes",
    category: "Personlig",
    title: "Biotherm Homme Aqua Power Advanced Gel"
  },
  {
    owner: "johannes",
    category: "Tøj/Sko",
    title: "Sort skjorte, 44 regular"
  },
  {
    owner: "johannes",
    category: "Personlig",
    title: "Stofposer til vinflasker, gerne nummererede, gerne hjemmesyede"
  },
  {
    owner: "johannes",
    category: "Køkken mv.",
    title: "Tortillapresse",
    link: "https://www.kunstogkokkentoj.dk/product/tortillapresse-stoebejern-20-cm-victoria?variant=081-002-00"
  }
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      url.pathname = "/admin.html";
      return Response.redirect(url.toString(), 302);
    }

    if (url.pathname === "/admin.html") {
      const authorized = isAuthorized(request, env);
      if (!authorized.ok) {
        return authorized.response;
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env, url) {
  if (request.method === "GET" && url.pathname === "/api/public") {
    const state = await readState(env);
    return jsonResponse(toPublicPayload(state));
  }

  if (request.method === "POST" && url.pathname === "/api/claim") {
    const body = await readJson(request);
    const name = `${body.name || ""}`.trim();
    const wishId = `${body.wishId || ""}`.trim();

    if (!name || !wishId) {
      return jsonResponse({ error: "Navn og gave er påkrævet." }, 400);
    }

    const state = await readState(env);
    const wish = state.wishes.find((entry) => entry.id === wishId);

    if (!wish || wish.received) {
      return jsonResponse({ error: "Ønsket findes ikke længere." }, 404);
    }

    if (wish.claimedBy) {
      return jsonResponse({ error: "Ønsket er allerede valgt." }, 409);
    }

    wish.claimedBy = name;
    wish.claimedAt = new Date().toISOString();
    state.updatedAt = new Date().toISOString();

    await writeState(env, state);
    return jsonResponse({ ok: true });
  }

  if (url.pathname.startsWith("/api/admin")) {
    const authorized = isAuthorized(request, env);
    if (!authorized.ok) {
      return authorized.response;
    }

    if (request.method === "GET" && url.pathname === "/api/admin") {
      const state = await readState(env);
      return jsonResponse(toAdminPayload(state));
    }

    if (request.method === "POST" && url.pathname === "/api/admin/categories") {
      const body = await readJson(request);
      const name = `${body.name || ""}`.trim();

      if (!name) {
        return jsonResponse({ error: "Kategorinavn mangler." }, 400);
      }

      const state = await readState(env);
      if (!state.categories.includes(name)) {
        state.categories.push(name);
        state.categories.sort((left, right) => left.localeCompare(right, "da"));
        state.updatedAt = new Date().toISOString();
        await writeState(env, state);
      }

      return jsonResponse(toAdminPayload(state));
    }

    if (request.method === "POST" && url.pathname === "/api/admin/wishes") {
      const body = await readJson(request);
      const title = `${body.title || ""}`.trim();
      const category = `${body.category || ""}`.trim();
      const owner = `${body.owner || ""}`.trim();
      const link = `${body.link || ""}`.trim();

      if (!title || !category || !owner) {
        return jsonResponse({ error: "Titel, kategori og liste er påkrævet." }, 400);
      }

      if (!["anni", "johannes", "shared"].includes(owner)) {
        return jsonResponse({ error: "Ugyldig liste." }, 400);
      }

      const state = await readState(env);
      if (!state.categories.includes(category)) {
        state.categories.push(category);
        state.categories.sort((left, right) => left.localeCompare(right, "da"));
      }

      state.wishes.push(createWish({ title, category, owner, link }));
      state.updatedAt = new Date().toISOString();

      await writeState(env, state);
      return jsonResponse(toAdminPayload(state), 201);
    }

    if (request.method === "POST" && url.pathname === "/api/admin/reset-claims") {
      const state = await readState(env);
      state.wishes = state.wishes.map((wish) =>
        wish.received
          ? wish
          : {
              ...wish,
              claimedBy: null,
              claimedAt: null
            }
      );
      state.lastResetAt = new Date().toISOString();
      state.updatedAt = state.lastResetAt;

      await writeState(env, state);
      return jsonResponse(toAdminPayload(state));
    }

    const receivedMatch = url.pathname.match(/^\/api\/admin\/wishes\/([^/]+)\/received$/);
    if (request.method === "POST" && receivedMatch) {
      const body = await readJson(request);
      const state = await readState(env);
      const wish = state.wishes.find((entry) => entry.id === receivedMatch[1]);

      if (!wish) {
        return jsonResponse({ error: "Ønsket blev ikke fundet." }, 404);
      }

      wish.received = Boolean(body.received);
      state.updatedAt = new Date().toISOString();

      await writeState(env, state);
      return jsonResponse(toAdminPayload(state));
    }
  }

  return jsonResponse({ error: "Ikke fundet." }, 404);
}

function isAuthorized(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "ADMIN_PASSWORD er ikke sat i Cloudflare." },
        500
      )
    };
  }

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) {
    return {
      ok: false,
      response: new Response("Login kræves.", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin"',
          "Content-Type": "text/plain; charset=utf-8"
        }
      })
    };
  }

  const decoded = atob(header.slice(6));
  const separator = decoded.indexOf(":");
  const username = separator >= 0 ? decoded.slice(0, separator) : "";
  const password = separator >= 0 ? decoded.slice(separator + 1) : "";

  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    return {
      ok: false,
      response: new Response("Forkert login.", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin"',
          "Content-Type": "text/plain; charset=utf-8"
        }
      })
    };
  }

  return { ok: true };
}

async function readState(env) {
  const existing = await env.WISHLIST_BUCKET.get(DATA_KEY);
  if (!existing) {
    const seeded = createInitialState();
    await writeState(env, seeded);
    return seeded;
  }

  const parsed = await existing.json();
  if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.wishes)) {
    const seeded = createInitialState();
    await writeState(env, seeded);
    return seeded;
  }

  return parsed;
}

async function writeState(env, state) {
  await env.WISHLIST_BUCKET.put(DATA_KEY, JSON.stringify(state, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8"
    }
  });
}

function createInitialState() {
  const now = new Date().toISOString();
  return {
    categories: [...DEFAULT_CATEGORIES],
    wishes: DEFAULT_WISHES.map((wish) => createWish(wish)),
    createdAt: now,
    updatedAt: now,
    lastResetAt: null
  };
}

function createWish({ title, category, owner, link = "" }) {
  return {
    id: crypto.randomUUID(),
    title,
    category,
    owner,
    link: link || null,
    claimedBy: null,
    claimedAt: null,
    received: false,
    createdAt: new Date().toISOString()
  };
}

function toPublicPayload(state) {
  return {
    categories: state.categories,
    wishes: sortWishes(state.wishes)
      .filter((wish) => !wish.received)
      .map((wish) => ({
        id: wish.id,
        title: wish.title,
        category: wish.category,
        owner: wish.owner,
        link: wish.link,
        claimed: Boolean(wish.claimedBy)
      }))
  };
}

function toAdminPayload(state) {
  return {
    categories: state.categories,
    wishes: sortWishes(state.wishes).map((wish) => ({
      id: wish.id,
      title: wish.title,
      category: wish.category,
      owner: wish.owner,
      link: wish.link,
      received: wish.received,
      createdAt: wish.createdAt
    })),
    lastResetAt: state.lastResetAt
  };
}

function sortWishes(wishes) {
  return [...wishes].sort((left, right) => {
    const ownerOrder = ownerRank(left.owner) - ownerRank(right.owner);
    if (ownerOrder !== 0) {
      return ownerOrder;
    }

    const categoryOrder = left.category.localeCompare(right.category, "da");
    if (categoryOrder !== 0) {
      return categoryOrder;
    }

    return left.title.localeCompare(right.title, "da");
  });
}

function ownerRank(owner) {
  return { anni: 0, johannes: 1, shared: 2 }[owner] ?? 99;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

