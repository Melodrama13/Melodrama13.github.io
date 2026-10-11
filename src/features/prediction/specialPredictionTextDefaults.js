

const COVER_TEXT_STORAGE_KEY = 'pjsk_special_predict_cover_text_blocks_v1';

const GLOBAL_COVER_TEXT_ID = '__global__';

const PREDICTOR_TEXT_ID = '__predictor__';

const ALL_EVENT_NOTES_ID = '__all_event_notes__';

const EVENT_NOTE_ID_PREFIX = '__event_note__:';

const ALL_PAGE_CONFIG_KEY = '__all_pages__';

const CUSTOM_COLOR_KEY = '__custom';

const FONT_DATABASE_NAME = 'pjsk_special_predict_fonts_v1';

const FONT_DATABASE_STORE = 'fonts';

const DEFAULT_CUSTOM_MONTH_COLOR = '#ffcaa6';

const DEFAULT_CUSTOM_BACKGROUND_COLOR = '#c8c9e8';

const CASE_LABEL_DARK_TEXT_LUMINANCE = 0.42;

const GLOBAL_TEXT_STYLE_KEYS = Object.freeze([
  'fontFamily',
  'fontSize',
  'color',
  'shadowColor',
  'align',
  'weight',
  'italic',
  'underline',
  'lineHeight',
  'letterSpacing',
  'verticalAlign',
  'opacity',
  'shadowEnabled'
]);

const createDefaultCreditTextStyle = () => ({
  fontFamily: 'inherit',
  fontSize: 18,
  color: '#ffffff',
  shadowColor: '',
  align: 'center',
  weight: 800,
  italic: false,
  underline: false,
  lineHeight: 1.3,
  letterSpacing: 0,
  opacity: 100,
  shadowEnabled: true
});

const createDefaultEventNote = (eventId) => ({
  id: String(eventId || ''),
  name: `${String(eventId || '')}备注`,
  text: '',
  fontFamily: 'inherit',
  fontSize: 12,
  color: '#334155',
  shadowColor: '',
  align: 'right',
  weight: 500,
  italic: false,
  underline: false,
  lineHeight: 1.25,
  letterSpacing: 0,
  opacity: 100,
  shadowEnabled: false
});

const EVENT_NOTE_STYLE_KEYS = Object.freeze(
  GLOBAL_TEXT_STYLE_KEYS.filter((key) => key !== 'verticalAlign')
);

const createDefaultCoverTextBlocks = () => [
  {
    id: 'title',
    name: '左上标题',
    text: 'プロセカ\n活动预测',
    x: 5,
    y: 8,
    w: 40,
    h: 40,
    fontSize: 35,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 900,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: 2
  },
  {
    id: 'note',
    name: '左下说明',
    text: '情况很多',
    x: 5,
    y: 50,
    w: 55,
    h: 40,
    fontSize: 18,
    color: '#ffffff',
    shadowColor: '',
    align: 'left',
    weight: 800,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: 2
  },
  {
    id: 'reference',
    name: '右侧参考',
    text: '仅供参考\n仅供参考\n仅供参考\n仅供参考\n仅供参考\n仅供参考',
    x: 66,
    y: 12,
    w: 28,
    h: 70,
    fontSize: 35,
    color: '#ffffff',
    shadowColor: '',
    align: 'right',
    weight: 900,
    fontFamily: 'inherit',
    italic: false,
    underline: false,
    lineHeight: 1.28,
    letterSpacing: 0,
    verticalAlign: 'top',
    padding: 4,
    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 32,
    borderEnabled: false,
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 6,
    opacity: 100,
    shadowEnabled: true,
    zIndex: 2
  }
];
export { COVER_TEXT_STORAGE_KEY, GLOBAL_COVER_TEXT_ID, PREDICTOR_TEXT_ID, ALL_EVENT_NOTES_ID, EVENT_NOTE_ID_PREFIX, ALL_PAGE_CONFIG_KEY, CUSTOM_COLOR_KEY, FONT_DATABASE_NAME, FONT_DATABASE_STORE, DEFAULT_CUSTOM_MONTH_COLOR, DEFAULT_CUSTOM_BACKGROUND_COLOR, CASE_LABEL_DARK_TEXT_LUMINANCE, GLOBAL_TEXT_STYLE_KEYS, createDefaultCreditTextStyle, createDefaultEventNote, EVENT_NOTE_STYLE_KEYS, createDefaultCoverTextBlocks };
