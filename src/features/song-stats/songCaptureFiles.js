

export const sanitizeExportFileName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return cleaned || 'song-stats';
};

export const formatExportTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};
