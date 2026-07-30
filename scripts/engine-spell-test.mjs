const { createNewGame, confirmMulligan, selectHandCard, resolveSpellTarget, playSpell } = await import('/tmp/equate-test/engine.mjs');

let g = createNewGame('normal');
g = confirmMulligan(g, []);
g = {
  ...g,
  player: {
    ...g.player,
    mana: 5,
    maxMana: 5,
    hand: ['firelance', 'temper', 'bolt', 'mend'],
    board: [],
  },
  enemy: { ...g.enemy, board: [], heroHp: 30 },
};

let s = selectHandCard(g, 0);
console.assert(s.selection.kind === 'spell_target', 'enter spell_target');
s = { ...s, animating: true };
const after = resolveSpellTarget(s, { kind: 'hero', side: 'enemy' });
console.log('firelance', after.enemy.heroHp, after.selection.kind, after.player.mana);
console.assert(after.enemy.heroHp === 27, 'firelance 3 dmg');
console.assert(after.selection.kind === 'none', 'cleared');
console.assert(!after.player.hand.includes('firelance'), 'consumed');

const aoe = playSpell({ ...g, animating: true, player: { ...g.player, mana: 7, hand: ['cataclysm'] } }, 0, null);
console.assert(aoe.enemy.heroHp === 27, 'cataclysm');

s = {
  ...g,
  player: {
    ...g.player,
    mana: 5,
    hand: ['temper'],
    board: [{
      uid: 'mtest', defId: 'squire', attack: 1, health: 2, maxHealth: 2,
      keywords: [], canAttack: false, canHitFace: true, attacksThisTurn: 0, shield: false,
    }],
  },
};
s = selectHandCard(s, 0);
const buffed = resolveSpellTarget({ ...s, animating: true }, { kind: 'minion', uid: 'mtest', side: 'player' });
const m = buffed.player.board.find((x) => x.uid === 'mtest');
console.assert(m?.attack === 3 && m?.health === 4, 'temper', m);

console.log('ALL SPELL TESTS PASSED');
