import { useCallback, useEffect, useState } from "react";
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-notifications";

export type PushState = "unsupported" | "default" | "denied" | "granted" | "loading";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    const perm = getPermissionState();
    setState(perm === "unsupported" ? "unsupported" : perm);
  }, []);

  const subscribe = useCallback(async () => {
    setState("loading");
    const ok = await subscribeToPush();
    setState(ok ? "granted" : getPermissionState() === "unsupported" ? "unsupported" : Notification.permission);
    return ok;
  }, []);

  const unsubscribe = useCallback(async () => {
    setState("loading");
    await unsubscribeFromPush();
    setState("default");
  }, []);

  return { state, subscribe, unsubscribe };
}
