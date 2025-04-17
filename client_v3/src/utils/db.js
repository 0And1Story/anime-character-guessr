import axios from "axios";

const DB_SERVER_URL = import.meta.env.VITE_DB_SERVER_URL;

if (import.meta.env.VITE_ENABLE_DB_SERVER && !DB_SERVER_URL) {
  throw new Error('VITE_DB_SERVER_URL environment variable is not defined');
}

export async function submitCharacterTags(characterId, tags) {
  if (!import.meta.env.VITE_ENABLE_DB_SERVER) return;
  try {
    const response = await fetch(`${DB_SERVER_URL}/api/character-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        characterId,
        tags,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error submitting character tags:', error);
    throw error;
  }
}

export async function proposeCustomTags(characterId, tags) {
  if (!import.meta.env.VITE_ENABLE_DB_SERVER) return;
  try {
    const response = await fetch(`${DB_SERVER_URL}/api/propose-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        characterId,
        tags,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error proposing custom tags:', error);
    throw error;
  }
}

