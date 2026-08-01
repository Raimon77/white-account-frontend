const TOKEN_STORAGE_KEY = "white_account_token";
const USER_STORAGE_KEY = "white_account_user";

export const AUTH_SESSION_EXPIRED_EVENT = "white-account:session-expired";

type JwtPayload = {
  exp?: number;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    return JSON.parse(window.atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getTokenExpiration(token: string) {
  const expiration = decodeJwtPayload(token)?.exp;
  return typeof expiration === "number" ? expiration * 1000 : null;
}

export function isTokenExpired(token: string) {
  const expiration = getTokenExpiration(token);
  return expiration === null || expiration <= Date.now();
}

export function hasActiveSession() {
  const token = getAuthToken();
  return Boolean(token && !isTokenExpired(token));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  document.body.classList.remove("role-admin");
}

export function expireAuthSession() {
  clearAuthSession();
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

export function scheduleTokenExpiration(
  token: string,
  onExpired: () => void
) {
  const maximumDelay = 2_147_000_000;
  let timeoutId: number | undefined;
  let cancelled = false;

  const scheduleNextCheck = () => {
    if (cancelled) return;

    const expiration = getTokenExpiration(token);
    const remainingTime = expiration === null ? 0 : expiration - Date.now();

    if (remainingTime <= 0) {
      onExpired();
      return;
    }

    timeoutId = window.setTimeout(
      scheduleNextCheck,
      Math.min(remainingTime, maximumDelay)
    );
  };

  scheduleNextCheck();

  return () => {
    cancelled = true;
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  };
}
