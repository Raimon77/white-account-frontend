import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearAuthSession,
  expireAuthSession,
  getAuthToken,
  isTokenExpired,
  scheduleTokenExpiration,
} from "@/auth/session";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [sessionState, setSessionState] = useState<
    "valid" | "missing" | "expired"
  >(() => {
    const token = getAuthToken();
    if (!token) return "missing";
    return isTokenExpired(token) ? "expired" : "valid";
  });

  useEffect(() => {
    const token = getAuthToken();

    const handleExpiredSession = () => setSessionState("expired");
    window.addEventListener(
      AUTH_SESSION_EXPIRED_EVENT,
      handleExpiredSession
    );

    if (!token) {
      return () => {
        window.removeEventListener(
          AUTH_SESSION_EXPIRED_EVENT,
          handleExpiredSession
        );
      };
    }

    if (isTokenExpired(token)) {
      clearAuthSession();
      return () => {
        window.removeEventListener(
          AUTH_SESSION_EXPIRED_EVENT,
          handleExpiredSession
        );
      };
    }

    const stopExpirationTimer = scheduleTokenExpiration(token, () => {
      expireAuthSession();
      setSessionState("expired");
    });

    return () => {
      stopExpirationTimer();
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleExpiredSession
      );
    };
  }, []);

  if (sessionState === "missing") {
    return <Navigate to="/login" replace />;
  }

  if (sessionState === "expired") {
    return <Navigate to="/login?reason=session-expired" replace />;
  }

  return children;
}

export default ProtectedRoute;
