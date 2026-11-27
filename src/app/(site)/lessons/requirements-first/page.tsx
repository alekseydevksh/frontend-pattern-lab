import { requirementsFirst } from '@content/lessons/requirements-first';
import { requirementsScene } from '@/components/scenes/RequirementsScene';
import { lessonMetadata, lessonPage } from '../lessonPage';

export const metadata = lessonMetadata(requirementsFirst);
export default lessonPage(requirementsFirst, requirementsScene);
