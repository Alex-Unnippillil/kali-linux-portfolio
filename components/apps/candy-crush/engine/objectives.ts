import type { Coord, Objective, Color } from './types';

export const updateObjectives = (
  objectives: Objective[],
  params: { removed: Coord[]; removedColors: Color[]; scoreDelta: number; jellyCleared: number; iceCleared: number },
): Objective[] =>
  objectives.map((objective) => {
    if (objective.type === 'score') {
      return { ...objective, progress: objective.progress + params.scoreDelta };
    }
    if (objective.type === 'collectColor') {
      const count = params.removedColors.filter((color) => color === objective.color).length;
      return { ...objective, progress: objective.progress + count };
    }
    if (objective.type === 'clearJelly') {
      return { ...objective, progress: objective.progress + params.jellyCleared };
    }
    if (objective.type === 'clearIce') {
      return { ...objective, progress: objective.progress + params.iceCleared };
    }
    return objective;
  });

export const objectivesMet = (objectives: Objective[]) =>
  objectives.every((objective) => objective.progress >= objective.target);
