import { containerViewViewmodel } from '@content/lessons/container-view-viewmodel';
import { containerViewScene } from '@/components/scenes/ContainerViewScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(containerViewViewmodel);
export default lessonPage(containerViewViewmodel, containerViewScene);
