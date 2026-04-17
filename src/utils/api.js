const getTrimmedBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const configured = getTrimmedBaseUrl(process.env.EXPO_PUBLIC_API_URL);

  if (configured) {
    return configured;
  }

  return "http://localhost:5000/api";
};

export const getSocketBaseUrl = () => {
  const configured = getTrimmedBaseUrl(process.env.EXPO_PUBLIC_SOCKET_URL);

  if (configured) {
    return configured;
  }

  return "http://localhost:5000";
};

export const buildApiUrl = (path) => {
  if (!path) {
    return getApiBaseUrl();
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = getApiBaseUrl();
  const suffix = String(path).startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${suffix}`;
};

export const unwrapApiResponse = (response) => {
  if (!response || typeof response !== "object") {
    return response;
  }

  if (response.success === true) {
    if (response.data !== undefined) {
      return response.data;
    }

    return response;
  }

  return response.data !== undefined ? response.data : response;
};

export const getApiErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  return fallback;
};

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

export const apiRequest = async (path, { method = "GET", token, body, headers = {} } = {}) => {
  const url = buildApiUrl(path);
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const options = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const payload = await parseJsonSafely(response);
  const data = unwrapApiResponse(payload);

  if (!response.ok) {
    const errorMessage =
      payload?.message ||
      payload?.error ||
      payload?.data?.message ||
      (typeof data === "string" ? data : null) ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload ?? data;
};

export const apiGet = (path, options = {}) => apiRequest(path, { ...options, method: "GET" });
export const apiPost = (path, body, options = {}) =>
  apiRequest(path, { ...options, method: "POST", body });
export const apiPut = (path, body, options = {}) =>
  apiRequest(path, { ...options, method: "PUT", body });
export const apiPatch = (path, body, options = {}) =>
  apiRequest(path, { ...options, method: "PATCH", body });
export const apiDelete = (path, options = {}) => apiRequest(path, { ...options, method: "DELETE" });
