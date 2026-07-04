import type { DemoUser } from "@/types/truthscout";

const STORAGE_KEY = "truthscout_user_id";

export function getStoredDemoUserId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredDemoUserId(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, userId);
}

export function selectDemoUser(demoUsers: DemoUser[]) {
  if (demoUsers.length === 0) {
    return null;
  }

  const storedUserId = getStoredDemoUserId();
  const storedUser = demoUsers.find((user) => user.id === storedUserId);

  if (storedUser) {
    return storedUser;
  }

  const randomIndex = Math.floor(Math.random() * demoUsers.length);
  const selectedUser = demoUsers[randomIndex] ?? demoUsers[0];
  setStoredDemoUserId(selectedUser.id);

  return selectedUser;
}
