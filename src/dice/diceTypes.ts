import type { DiceTypeId } from '../types';

export interface DiceType {
  id: DiceTypeId;
  label: string;
  /** Optional behavior flag (e.g. 'bonus' for TIME/GOLD/NOVA). */
  behavior?: 'normal' | 'bonus';
}

export const DICE_TYPES: Record<string, DiceType> = {
  normal: { id: 'normal', label: 'Normal', behavior: 'normal' },
  bonus: { id: 'bonus', label: 'Bonus', behavior: 'bonus' },
};

export function getDiceType(id: DiceTypeId): DiceType {
  const t = DICE_TYPES[id as string];
  return (t ?? DICE_TYPES['normal']) as DiceType;
}
