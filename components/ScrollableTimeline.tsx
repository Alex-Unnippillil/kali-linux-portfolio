import ScrollableTimelineClient, {
  GroupedMilestone,
  Milestone,
} from './ScrollableTimelineClient';
import rawMilestones from '../data/milestones.json';

interface TimelineGroup {
  year: string;
  milestones: GroupedMilestone[];
}

const buildGroups = (): TimelineGroup[] => {
  const milestones = rawMilestones as Milestone[];
  const groups = new Map<string, GroupedMilestone[]>();

  milestones.forEach((milestone) => {
    const [year, month] = milestone.date.split('-');
    const entry: GroupedMilestone = { ...milestone, month };
    const existing = groups.get(year);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(year, [entry]);
    }
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, entries]) => ({ year, milestones: entries }));
};

export default function ScrollableTimeline() {
  const groups = buildGroups();
  return <ScrollableTimelineClient groups={groups} />;
}
