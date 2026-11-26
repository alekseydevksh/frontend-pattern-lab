import { optimisticUi } from '@content/lessons/optimistic-ui';
import { optimisticUiScene } from '@/components/scenes/OptimisticUiScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(optimisticUi);
export default lessonPage(optimisticUi, optimisticUiScene);
