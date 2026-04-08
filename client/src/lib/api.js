const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Bir hata olustu.");
  }

  return payload;
}

export const api = {
  getFoods: () => request("/foods"),
  addFood: (body) => request("/foods", { method: "POST", body: JSON.stringify(body) }),
  removeFood: (foodId) => request(`/foods/${foodId}`, { method: "DELETE" }),
  generatePlan: (body) => request("/generate", { method: "POST", body: JSON.stringify(body) }),
  swapMealItem: (body) => request("/swap", { method: "POST", body: JSON.stringify(body) })
};
