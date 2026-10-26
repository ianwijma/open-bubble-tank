import art from '../data/tutorial-art.json';
export const TUTORIAL = art;
export type TutorialStage = 0 | 1 | 2 | 3 | 4;
/** BTAGameWorld.AttachNewBubblefield chooses before incrementing its unique-field counter. */
export const tutorialForAttachment = (visited: number): TutorialStage =>
  visited >= 1 && visited <= 3 ? ((visited + 1) as TutorialStage) : 0;
export const tutorialDescription = (stage: number) =>
  stage === 0
    ? 'Armor Games'
    : stage === 1
      ? 'Use WASD keys to move. Use your mouse to aim; hold the left mouse button to shoot. Try moving outside this bubble.'
      : TUTORIAL.stages[stage].texts.map((line) => line.text).join(' ');
