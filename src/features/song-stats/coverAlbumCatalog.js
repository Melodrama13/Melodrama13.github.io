/** CD editions, in official track order. Keep history independent of date/filter changes. */
export const OFFICIAL_COVER_ALBUMS = Object.freeze([
  { unit: 'ln', volume: 1, songIds: [2, 3, 6, 18, 93, 75, 91, 8, 96, 120, 135, 171], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000005616.000014827.html' },
  { unit: 'ln', volume: 2, songIds: [98, 199, 155, 208, 241, 226, 243, 289, 255, 286, 321, 323], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000007585.000014827.html' },
  { unit: 'ln', volume: 3, songIds: [339, 395, 372, 407, 438, 456, 396, 458, 443, 477, 534, 484], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000008720.000014827.html' },
  { unit: 'mmj', volume: 1, songIds: [10, 71, 13, 73, 11, 70, 87, 107, 123, 121, 154, 157], sourceUrl: 'https://www.sega.jp/topics/detail/220302_4/' },
  { unit: 'mmj', volume: 2, songIds: [172, 147, 169, 188, 168, 213, 242, 269, 281, 320, 258, 354], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000007495.000014827.html' },
  { unit: 'mmj', volume: 3, songIds: [361, 355, 369, 377, 413, 417, 431, 482, 494, 495, 511, 530], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000008719.000014827.html' },
  { unit: 'vbs', volume: 1, songIds: [69, 26, 28, 27, 81, 100, 15, 95, 102, 143, 136, 133], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000005681.000014827.html' },
  { unit: 'vbs', volume: 2, songIds: [167, 200, 205, 210, 195, 266, 253, 262, 291, 299, 322, 276], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000007539.000014827.html' },
  { unit: 'vbs', volume: 3, songIds: [344, 365, 392, 418, 410, 437, 441, 522, 505, 557, 513, 490], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000008780.000014827.html' },
  { unit: 'ws', volume: 1, songIds: [41, 38, 78, 21, 36, 68, 88, 122, 106, 138, 134, 183], sourceUrl: 'https://bushiroad.com/media/fc9d959b977b57b5' },
  { unit: 'ws', volume: 2, songIds: [158, 174, 146, 201, 198, 246, 240, 225, 260, 298, 306, 307], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000007460.000014827.html' },
  { unit: 'ws', volume: 3, songIds: [346, 360, 367, 376, 432, 436, 434, 480, 493, 506, 475, 533], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000008683.000014827.html' },
  { unit: 'nc', volume: 1, songIds: [67, 19, 66, 22, 92, 74, 94, 125, 139, 129, 111, 145], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000005511.000014827.html' },
  { unit: 'nc', volume: 2, songIds: [170, 204, 181, 194, 218, 272, 277, 270, 268, 294, 293, 352], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000007418.000014827.html' },
  { unit: 'nc', volume: 3, songIds: [340, 358, 385, 391, 378, 402, 469, 455, 501, 451, 473, 476], sourceUrl: 'https://prtimes.jp/main/html/rd/p/000008649.000014827.html' }
]);

/** Observed omissions, not permanent exclusions or assertions about licensing. */
export const COVER_ALBUM_EXCEPTIONS = Object.freeze([
  { unit: 'ln', songId: 148 }, // ray
  { unit: 'ln', songId: 184 }, // Hello,world! (not Hello, Worker)
  { unit: 'vbs', songId: 245 } // 阿吽のビーツ
]);
