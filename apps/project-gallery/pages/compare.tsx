import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import { FixedSizeList as List } from 'react-window';
import projectsData from '../../../data/projects.json';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo: string;
  demo: string;
  snippet: string;
  language: string;
}

interface MetricsListProps {
  project: Project;
}

const MetricsList: React.FC<MetricsListProps> = ({ project }) => {
  const metrics = useMemo(
    () =>
      Object.entries(project).map(([key, value]) => ({
        label: key,
        value: Array.isArray(value) ? value.join(', ') : String(value),
      })),
    [project]
  );

  return (
    <List height={200} itemCount={metrics.length} itemSize={32} width="100%">
      {({ index, style }) => {
        const metric = metrics[index];
        return (
          <div style={style} className="flex justify-between px-2">
            <span className="font-semibold mr-2">{metric.label}</span>
            <span className="truncate">{metric.value}</span>
          </div>
        );
      }}
    </List>
  );
};

const ProjectPanel: React.FC<{ project?: Project }> = ({ project }) => {
  if (!project) return <div className="p-4">Project not found</div>;
  return (
    <div className="bg-gray-800 rounded text-white p-4 space-y-2 flex-1">
      <h2 className="text-lg font-bold">{project.title}</h2>
      <img
        src={project.thumbnail}
        alt={project.title}
        className="w-full h-40 object-cover rounded"
        loading="lazy"
      />
      <MetricsList project={project} />
    </div>
  );
};

const ComparePage: React.FC = () => {
  const router = useRouter();
  const { left, right } = router.query;

  const projects = projectsData as Project[];
  const leftProject = projects.find(
    (p) => String(p.id) === (Array.isArray(left) ? left[0] : left)
  );
  const rightProject = projects.find(
    (p) => String(p.id) === (Array.isArray(right) ? right[0] : right)
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Compare Projects</h1>
      <div className="flex flex-col md:flex-row gap-4">
        <ProjectPanel project={leftProject} />
        <ProjectPanel project={rightProject} />
      </div>
    </div>
  );
};

export default ComparePage;

