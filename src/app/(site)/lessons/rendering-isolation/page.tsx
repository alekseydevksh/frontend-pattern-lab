import { renderingIsolation } from '@content/lessons/rendering-isolation';
import { renderingIsolationScene } from '@/components/scenes/RenderingIsolationScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(renderingIsolation);
export default lessonPage(renderingIsolation, renderingIsolationScene);
