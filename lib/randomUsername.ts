const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const USERNAME_LENGTH = 6;

/**
 * Generates a throwaway guest username made only of random lowercase letters
 * (e.g. "qmzlkt") — no word list, no sequential numbering. The username's
 * first letter doubles as the guest's avatar initial everywhere in the UI
 * (`Avatar`/`AvatarFallback` already do `username.slice(0, 1).toUpperCase()`),
 * so any name works as long as it's just letters.
 */
export function generateRandomUsername(length: number = USERNAME_LENGTH): string {
  let username = "";
  for (let i = 0; i < length; i++) {
    username += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return username;
}
