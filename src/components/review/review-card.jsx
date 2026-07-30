import { CardShell } from './card-shell';
import { FillBlankBody } from './fill-blank-body';
import { MultipleChoiceBody } from './multiple-choice-body';

export function ReviewCard({ card, onReveal, onGrade, onToggleFavorite, onNoteChange, onNoteFocus }) {
  return (
    <CardShell
      prompt={card.prompt}
      dataset={card.dataset}
      chart={card.chart}
      favorite={card.favorite}
      onToggleFavorite={onToggleFavorite}
      note={card.note}
      onNoteChange={onNoteChange}
      onNoteFocus={onNoteFocus}>
      {card.type === 'fill-blank' ? (
        <FillBlankBody card={card} onReveal={onReveal} />
      ) : (
        <MultipleChoiceBody card={card} onGrade={onGrade} />
      )}
    </CardShell>
  );
}
