/** History rows are direct flow children, ordered by their actual screen position. */
export function getHistoryRowsInBounds(list, top, bottom) {
  const children = list?.children;
  if (!children?.length || bottom < top) return [];

  // Search live geometry, without estimated heights or coordinates cached
  // across filtering, sorting, editor resize or progressive image loading.
  let start = 0;
  let end = children.length;
  while (start < end) {
    const middle = Math.floor((start + end) / 2);
    if (children[middle].getBoundingClientRect().bottom < top) start = middle + 1;
    else end = middle;
  }

  const rows = [];
  for (let index = start; index < children.length; index++) {
    const element = children[index];
    const rect = element.getBoundingClientRect();
    if (rect.top > bottom) break;
    if (rect.bottom >= top) rows.push({ element, rect });
  }
  return rows;
}
