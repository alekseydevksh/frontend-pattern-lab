import { stateOwnership } from '@content/lessons/state-ownership';
import { stateOwnershipScene } from '@/components/scenes/StateOwnershipScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(stateOwnership);
export default lessonPage(stateOwnership, stateOwnershipScene);
