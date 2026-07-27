// Integracao opcional com a Dattebayo API (dados publicos de personagens).
// Usada apenas para enriquecer nomes/retratos/jutsus em runtime.
// Sempre com fallback: se a API falhar, o jogo funciona com os dados embutidos.

import { ROSTER } from "./data";

const API_BASE = "https://dattebayo-api.onrender.com";

interface ApiCharacter {
  id: number;
  name: string;
  images?: string[];
  jutsu?: string[];
}

interface ApiResponse {
  characters: ApiCharacter[];
}

// Busca todos os personagens do roster na API e preenche portraitUrl + jutsuList.
// Retorna true se conseguiu enriquecer ao menos 1 personagem.
export async function enrichRosterFromApi(timeoutMs = 6000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // A API pagina de 20 em 20; pegamos uma pagina grande o suficiente.
    const res = await fetch(`${API_BASE}/characters?pageSize=100`, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as ApiResponse;
    if (!data?.characters?.length) throw new Error("resposta vazia");

    let enriched = 0;
    for (const char of ROSTER) {
      const match = data.characters.find(
        (c) => c.name.toLowerCase() === char.apiName.toLowerCase()
      );
      if (match) {
        if (match.images && match.images.length > 0) {
          char.portraitUrl = match.images[0];
        }
        if (match.jutsu && match.jutsu.length > 0) {
          char.jutsuList = match.jutsu.slice(0, 8);
        }
        enriched++;
      }
    }
    return enriched > 0;
  } catch (err) {
    console.warn("[api] Nao foi possivel enriquecer pela Dattebayo API:", err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
