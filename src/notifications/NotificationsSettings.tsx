import { useEffect, useState } from "react";
const api = import.meta.env.VITE_REMINDERS_URL as string | undefined;
const storageKey = "personal-tools-reminders";
interface Preferences {
  token: string;
  morning: string;
  evening: string;
  timezone: string;
  enabled: boolean;
}
const defaults = {
  token: "",
  morning: "08:00",
  evening: "19:00",
  timezone: "Europe/London",
  enabled: true,
};
function saved(): Preferences {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "null") ?? defaults;
  } catch {
    return defaults;
  }
}
function applicationKey(key: string) {
  return Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
}
export function NotificationsSettings() {
  const [prefs, setPrefs] = useState<Preferences>(saved);
  const [publicKey, setPublicKey] = useState("");
  const [setup, setSetup] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const supported =
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator;
  const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    token = prefs.token,
  ) {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed");
    return result;
  }
  function remember(next: Preferences) {
    localStorage.setItem(storageKey, JSON.stringify(next));
    setPrefs(next);
  }
  useEffect(() => {
    if (!api) return;
    let active = true;
    request("/config")
      .then((r) => {
        if (active) setPublicKey(r.publicKey);
      })
      .catch(() => {
        if (active)
          setStatus("Reminder service unavailable. Try again when online.");
      });
    const existing = saved();
    if (existing.token)
      request("/reminders", "GET", undefined, existing.token)
        .then((r) => {
          if (active) remember({ ...existing, ...r });
        })
        .catch((e) => {
          if (active) setStatus(e.message);
        });
    return () => {
      active = false;
    };
  }, []);
  async function enable() {
    setBusy(true);
    setStatus("");
    try {
      // Permission must be requested directly from the user's tap, before network work.
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications are not allowed. Enable them in iPhone notification settings.",
        );
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey(publicKey),
        }));
      if (prefs.token) {
        await request("/reminders", "PUT", {
          ...prefs,
          enabled: true,
          subscription: subscription.toJSON(),
        });
        remember({ ...prefs, enabled: true });
      } else {
        const response = await fetch(`${api}/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Setup-Key": setup.trim(),
          },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Could not enable notifications");
        remember(result);
        setSetup("");
      }
      setStatus("Notifications enabled.");
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Could not enable notifications",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("Reconnect notifications first.");
      await request("/reminders", "PUT", {
        ...prefs,
        subscription: subscription.toJSON(),
      });
      remember(prefs);
      setStatus("Reminder times saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    try {
      await request("/reminders", "DELETE");
      const registration = await navigator.serviceWorker.ready;
      await (await registration.pushManager.getSubscription())?.unsubscribe();
      remember(defaults);
      setStatus("Notifications disconnected.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    try {
      await request("/test", "POST");
      setStatus("Test sent. Check your notifications.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not send test");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section card">
      <h2>Notifications</h2>
      {!api ? (
        <p>Reminder service is not configured.</p>
      ) : iphone && !installed ? (
        <p>Open this app from your Home Screen to enable notifications.</p>
      ) : !supported ? (
        <p>This browser does not support push notifications.</p>
      ) : (
        <>
          {!prefs.token && (
            <label className="notification-field">
              Setup code
              <input
                type="password"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
          )}
          {!prefs.token || Notification.permission !== "granted" ? (
            <button
              className="primary"
              disabled={busy || !publicKey || (!prefs.token && !setup.trim())}
              onClick={enable}
            >
              Enable notifications
            </button>
          ) : (
            <>
              <label className="notification-toggle">
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={(e) =>
                    setPrefs({ ...prefs, enabled: e.target.checked })
                  }
                />{" "}
                Daily reminders
              </label>
              <div className="reminder-times">
                <label className="notification-field">
                  Morning
                  <input
                    type="time"
                    value={prefs.morning}
                    onChange={(e) =>
                      setPrefs({ ...prefs, morning: e.target.value })
                    }
                  />
                </label>
                <label className="notification-field">
                  Evening
                  <input
                    type="time"
                    value={prefs.evening}
                    onChange={(e) =>
                      setPrefs({ ...prefs, evening: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="notification-field">
                Timezone
                <select
                  value={prefs.timezone}
                  onChange={(e) =>
                    setPrefs({ ...prefs, timezone: e.target.value })
                  }
                >
                  {[
                    ...new Set([
                      "Europe/London",
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                      prefs.timezone,
                    ]),
                  ].map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
              </label>
              <button className="primary" disabled={busy} onClick={save}>
                Save reminders
              </button>
              <button className="text-button" disabled={busy} onClick={test}>
                Send test notification
              </button>
            </>
          )}
        </>
      )}
      {status && (
        <p role="status" className="notification-status">
          {status}
        </p>
      )}
    </section>
  );
}
