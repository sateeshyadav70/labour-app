import Constants from "expo-constants";
import { Platform } from "react-native";

const getTrimmedBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const extractHostname = (value = "") => {
  const trimmed = getTrimmedBaseUrl(value);

  if (!trimmed) {
    return null;
  }

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    return new URL(normalized).hostname || null;
  } catch (_error) {
    return trimmed.replace(/^[a-z]+:\/\//i, "").split("/")[0].split(":")[0] || null;
  }
};

const isLikelyPrivateHost = (host = "") => {
  const value = String(host || "").trim().toLowerCase();

  if (!value) {
    return false;
  }

  return (
    value === "localhost" ||
    value === "127.0.0.1" ||
    value === "::1" ||
    value === "10.0.2.2" ||
    /^10\.\d+\.\d+\.\d+$/.test(value) ||
    /^192\.168\.\d+\.\d+$/.test(value) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(value)
  );
};

const getExpoHost = () => {
  const candidate =
    extractHostname(Constants.expoConfig?.hostUri) ||
    extractHostname(Constants.manifest2?.debuggerHost) ||
    extractHostname(Constants.manifest?.debuggerHost) ||
    extractHostname(Constants.expoGoConfig?.debuggerHost);

  return isLikelyPrivateHost(candidate) ? candidate : null;
};

const buildDevApiBaseUrl = () => {
  const expoHost = getExpoHost();

  if (expoHost) {
    return `http://${expoHost}:5000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
};

const buildDevSocketBaseUrl = () => {
  const expoHost = getExpoHost();

  if (expoHost) {
    return `http://${expoHost}:5000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }

  return "http://localhost:5000";
};

const shouldReplaceEmulatorPlaceholder = (value) => {
  if (Constants.isDevice !== true) {
    return false;
  }

  return /10\.0\.2\.2|localhost|127\.0\.0\.1/i.test(String(value || ""));
};

// Ensures the base URL always ends with "/api" so endpoints like "auth/login"
// resolve to "<host>/api/auth/login" regardless of how the env var is written.
const ensureApiSuffix = (value) => {
  const trimmed = getTrimmedBaseUrl(value);
  if (!trimmed) return trimmed;
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
};

export const getApiBaseUrl = () => {
  const configured = ensureApiSuffix(process.env.EXPO_PUBLIC_API_URL);

  if (configured) {
    if (shouldReplaceEmulatorPlaceholder(configured)) {
      return buildDevApiBaseUrl();
    }

    return configured;
  }

  return __DEV__ ? buildDevApiBaseUrl() : "http://192.168.227.1:5000/api";
};


export const getSocketBaseUrl = () => {
  const configured = getTrimmedBaseUrl(process.env.EXPO_PUBLIC_SOCKET_URL);

  if (configured) {
    if (shouldReplaceEmulatorPlaceholder(configured)) {
      return buildDevSocketBaseUrl();
    }

    return configured;
  }

  return __DEV__ ? buildDevSocketBaseUrl() : "http://192.168.227.1:5000";
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
  console.log("API Request URL:", url);
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

  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    const networkError = new Error(
      `Unable to reach ${url}. Check EXPO_PUBLIC_API_URL and make sure the backend is running on a reachable host/IP.`
    );
    networkError.cause = error;
    networkError.url = url;
    throw networkError;
  }

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
