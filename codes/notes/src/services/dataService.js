const BASE_PATH = '/docs';

/**
 * 获取笔记索引（所有笔记的列表）
 */
export async function getNoteIndex() {
  try {
    const response = await fetch(`${BASE_PATH}/notes/index.json`);
    if (!response.ok) throw new Error('Failed to load note index');
    const data = await response.json();
    return data.notes || [];
  } catch (error) {
    console.error('Error loading note index:', error);
    return [];
  }
}

/**
 * 根据 slug 获取单个笔记详情
 */
export async function getNoteBySlug(slug) {
  const response = await fetch(`${BASE_PATH}/notes/${slug}.json`);
  if (!response.ok) throw new Error(`Failed to load note: ${slug}`);
  return await response.json();
}

/**
 * 根据 slug 获取对应的复习卡
 */
export async function getCardsBySlug(slug) {
  const response = await fetch(`${BASE_PATH}/note-cards/${slug}.json`);
  if (!response.ok) throw new Error(`Failed to load cards: ${slug}`);
  return await response.json();
}

/**
 * 获取所有复习卡（用于复习卡库页面）
 */
export async function getAllCards() {
  try {
    const index = await getNoteIndex();
    const cardsPromises = index.map((note) =>
      getCardsBySlug(note.slug).catch(() => null),
    );
    const cardsData = await Promise.all(cardsPromises);
    return cardsData.filter(Boolean);
  } catch (error) {
    console.error('Error loading all cards:', error);
    return [];
  }
}
