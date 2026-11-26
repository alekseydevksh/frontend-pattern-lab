import { normalizedData } from '@content/lessons/normalized-data';
import { normalizedDataScene } from '@/components/scenes/NormalizedDataScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(normalizedData);
export default lessonPage(normalizedData, normalizedDataScene);
