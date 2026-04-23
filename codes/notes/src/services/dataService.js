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
    const cardsPromises = index.map(async (note) => {
      try {
        const cards = await getCardsBySlug(note.slug);
        return { ...cards, slug: note.slug };
      } catch {
        return null;
      }
    });
    const cardsData = await Promise.all(cardsPromises);
    return cardsData.filter(Boolean);
  } catch (error) {
    console.error('Error loading all cards:', error);
    return [];
  }
}

/**
 * 获取所有复习卡并附带元信息（用于全站复习）
 */
export async function getAllCardsWithMeta() {
  try {
    const index = await getNoteIndex();
    const cardsPromises = index.map(async (note) => {
      try {
        const cards = await getCardsBySlug(note.slug);
        return {
          noteId: cards.note_id,
          noteSlug: note.slug,
          noteTitle: note.title,
          tags: note.tags || [],
          cards: (cards.cards || []).map((card, idx) => ({
            ...card,
            cardId: `${cards.note_id}_${idx}`,
            noteId: cards.note_id,
            noteSlug: note.slug,
            noteTitle: note.title,
            tags: note.tags || [],
          })),
        };
      } catch {
        return null;
      }
    });
    const cardsData = await Promise.all(cardsPromises);
    return cardsData.filter(Boolean);
  } catch (error) {
    console.error('Error loading all cards with meta:', error);
    return [];
  }
}

/**
 * 筛选卡片
 */
export function filterCards(cards, filters) {
  let filtered = [...cards];

  // 按标签筛选
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((card) =>
      filters.tags.some((tag) => card.tags.includes(tag)),
    );
  }

  // 按笔记来源筛选
  if (filters.noteSlugs && filters.noteSlugs.length > 0) {
    filtered = filtered.filter((card) =>
      filters.noteSlugs.includes(card.noteSlug),
    );
  }

  // 按题型筛选
  if (filters.cardTypes && filters.cardTypes.length > 0) {
    filtered = filtered.filter((card) => filters.cardTypes.includes(card.type));
  }

  return filtered;
}

/**
 * 排序卡片
 */
export function sortCards(cards, order) {
  const sorted = [...cards];

  if (order === 'random') {
    // Fisher-Yates 洗牌算法
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }
  // 未来可扩展其他排序策略

  return sorted;
}
