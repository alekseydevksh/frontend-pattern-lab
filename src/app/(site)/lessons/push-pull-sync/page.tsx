import { pushPullSync } from '@content/lessons/push-pull-sync';
import { pushPullScene } from '@/components/scenes/PushPullScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(pushPullSync);
export default lessonPage(pushPullSync, pushPullScene);
