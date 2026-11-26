import { virtualization } from '@content/lessons/virtualization';
import { virtualizationScene } from '@/components/scenes/VirtualizationScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(virtualization);
export default lessonPage(virtualization, virtualizationScene);
