const BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "travel-buddy-token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// The API returns {"error": "text"} or {"error": {"field": ["text", ...]}}.
function describe(error) {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return error;
  return Object.values(error).flat().join(" ");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Is the API running?");
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, describe(data?.error));
  return data;
}

const query = (params) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== "" && value != null)
  ).toString();
  return search ? `?${search}` : "";
};

export const api = {
  login: (credentials) => request("/login", { method: "POST", body: credentials }),
  register: (details) => request("/users", { method: "POST", body: details }),
  me: () => request("/me"),
  updateUser: (id, changes) => request(`/users/${id}`, { method: "PATCH", body: changes }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  destinations: (filters = {}) => request(`/destinations${query(filters)}`),
  destination: (id) => request(`/destinations/${id}`),

  trips: () => request("/trips"),
  createTrip: (trip) => request("/trips", { method: "POST", body: trip }),
  updateTrip: (id, changes) => request(`/trips/${id}`, { method: "PATCH", body: changes }),
  cancelTrip: (id) => request(`/trips/${id}/cancel`, { method: "POST" }),
  deleteTrip: (id) => request(`/trips/${id}`, { method: "DELETE" }),

  createReview: (review) => request("/reviews", { method: "POST", body: review }),
  updateReview: (id, changes) => request(`/reviews/${id}`, { method: "PATCH", body: changes }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: "DELETE" }),
};
