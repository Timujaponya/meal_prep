const API_BASE = import.meta.env.VITE_API_URL || "/api";
let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

function getDefaultHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { ...getDefaultHeaders(), ...(options.headers || {}) },
    ...options
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Bir hata olustu.");
  }

  return payload;
}

export const api = {
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  getFoods: () => request("/foods"),
  getRecipes: () => request("/recipes"),
  resolveFoodQuery: (query) => request("/foods/resolve", { method: "POST", body: JSON.stringify({ query }) }),
  resolvePortionExpression: (expression) =>
    request("/foods/portion-resolve", { method: "POST", body: JSON.stringify({ expression }) }),
  addFood: (body) => request("/foods", { method: "POST", body: JSON.stringify(body) }),
  updateFood: (foodId, body) => request(`/foods/${foodId}`, { method: "PUT", body: JSON.stringify(body) }),
  removeFood: (foodId) => request(`/foods/${foodId}`, { method: "DELETE" }),
  getDashboardMeals: () => request("/dashboard-meals"),
  createDashboardMeal: (body) => request("/dashboard-meals", { method: "POST", body: JSON.stringify(body) }),
  updateDashboardMeal: (mealId, body) => request(`/dashboard-meals/${mealId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteDashboardMeal: (mealId) => request(`/dashboard-meals/${mealId}`, { method: "DELETE" }),
  getInventory: () => request("/inventory"),
  upsertInventory: (body) => request("/inventory", { method: "POST", body: JSON.stringify(body) }),
  incrementInventory: (body) => request("/inventory/increment", { method: "POST", body: JSON.stringify(body) }),
  generatePlan: (body) => request("/generate", { method: "POST", body: JSON.stringify(body) }),
  swapMealItem: (body) => request("/swap", { method: "POST", body: JSON.stringify(body) }),
  checkoutPlan: (body) => request("/checkout", { method: "POST", body: JSON.stringify(body) }),
  getDayLog: (date, targetMl) => {
    const query = new URLSearchParams({ date: String(date || "") });
    if (Number.isFinite(Number(targetMl))) {
      query.set("targetMl", String(Math.round(Number(targetMl))));
    }
    return request(`/day-log?${query.toString()}`);
  },
  updateDayLogEntry: ({ date, sourceId, entry, targetMl }) =>
    request(`/day-log/entries/${encodeURIComponent(String(sourceId || ""))}`, {
      method: "PUT",
      body: JSON.stringify({ date, entry, targetMl })
    }),
  addDayLogEntry: ({ date, entry, targetMl }) =>
    request("/day-log/entries", {
      method: "POST",
      body: JSON.stringify({ date, entry, targetMl })
    }),
  deleteDayLogEntry: (date, sourceId, targetMl) => {
    const query = new URLSearchParams({ date: String(date || "") });
    if (Number.isFinite(Number(targetMl))) {
      query.set("targetMl", String(Math.round(Number(targetMl))));
    }
    return request(`/day-log/entries/${encodeURIComponent(String(sourceId || ""))}?${query.toString()}`, {
      method: "DELETE"
    });
  },
  addWater: (body) => request("/water", { method: "POST", body: JSON.stringify(body) })
};
