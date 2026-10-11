<script>
import { defineComponent, h } from "vue";
import { getBaseName, normalizeUnit, normalizeGeneratedCardAttribute } from './specialPredictionFormatters.js';
const SpecialPredictionCardCell = defineComponent({
  name: 'SpecialPredictionCardCell',
  props: {
    card: { type: Object, default: null },
    isBanner: { type: Boolean, default: false },
    charMap: { type: Object, default: () => ({}) },
    vsNameSet: { type: Object, default: () => new Set() }
  },
  setup(cellProps) {
    const getCardImageSrc = (card) => {
      if (!card) return '';
      const base = getBaseName(card.Name);
      const meta = cellProps.charMap[base] || {};
      const abbr = String(meta.abbr || '').trim();
      if (!abbr) return '';
      if (cellProps.vsNameSet.has(base)) {
        const unit = normalizeUnit(card.Affiliation);
        if (unit && unit !== 'vs') return `/chibi_s/${abbr.toLowerCase()}_${unit}.webp`;
      }
      return `/chibi_s/${abbr}.webp`;
    };

    const buildLayers = () => {
      const card = cellProps.card;
      const rarity = String(card.Rarity || '').trim();
      const attr = normalizeGeneratedCardAttribute(card.Attribute);
      const unit = normalizeUnit(card.Affiliation);
      const charSrc = getCardImageSrc(card);
      const children = [
        h('img', { class: 'special-card-bg', src: `/specialized/bg${rarity || 4}.png`, alt: '' })
      ];

      if (cellProps.isBanner) {
        children.push(h('span', { class: 'special-card-glow', 'aria-hidden': 'true' }));
      }
      if (charSrc) {
        children.push(h('img', { class: 'special-card-chibi', src: charSrc, alt: getBaseName(card.Name) || '角色' }));
      }
      if (rarity) {
        children.push(h('img', { class: 'special-card-star', src: `/specialized/star${rarity}.png`, alt: `${rarity}星` }));
      }
      if (attr) {
        children.push(h('img', { class: 'special-card-attr', src: `/specialized/attr-${attr.toLowerCase()}.png`, alt: attr }));
      }
      if (cellProps.vsNameSet.has(getBaseName(card.Name)) && unit && unit !== 'vs') {
        children.push(h('img', { class: 'special-card-unit', src: `/specialized/unit-${unit}.png`, alt: unit }));
      }
      if (card.ribbonLabel) {
        children.push(h('span', { class: 'special-card-ribbon' }, [
          h('span', { class: 'special-card-ribbon-text' }, card.ribbonLabel)
        ]));
      }

      return h('div', {
        class: ['special-card-cell', { 'is-banner': cellProps.isBanner }],
        title: `${getBaseName(card.Name)} ${rarity || ''}`.trim()
      }, children);
    };

    return buildLayers;
  }
});
export default SpecialPredictionCardCell;
</script>
