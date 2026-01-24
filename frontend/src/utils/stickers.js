export const getStickerFormat = (sticker) => {
  const format = sticker?.format ?? sticker?.formatType ?? sticker?.format_type;
  if (format === 1 || format === 'PNG') return 'PNG';
  if (format === 2 || format === 'APNG') return 'APNG';
  if (format === 3 || format === 'LOTTIE') return 'LOTTIE';
  if (format === 4 || format === 'GIF') return 'GIF';
  return String(format || '').toUpperCase();
};

export const getStickerUrl = (sticker) => {
  if (!sticker?.id) return sticker?.url || '';
  const format = getStickerFormat(sticker);
  if (format === 'GIF') return `https://media.discordapp.net/stickers/${sticker.id}.gif`;
  if (format === 'LOTTIE') return `https://media.discordapp.net/stickers/${sticker.id}.json`;
  return sticker.url || `https://media.discordapp.net/stickers/${sticker.id}.png`;
};

export const isLottieSticker = (sticker) => getStickerFormat(sticker) === 'LOTTIE' || String(getStickerUrl(sticker)).endsWith('.json');
