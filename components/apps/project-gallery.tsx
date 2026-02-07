import React, { useMemo, useState, useCallback } from 'react';
import '../../styles/project-gallery.css';
import projectsData from '../../data/projects.json';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  category: string;
  featured: boolean;
  year: number;
  stars: number;
  commits: number;
  lastUpdated: string;
  repo: string;
  demo: string;
  language: string;
}

interface Props {
  openApp?: (id: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📁' },
  { id: 'web', label: 'Web', icon: '🌐' },
  { id: 'game', label: 'Games', icon: '🎮' },
  { id: 'security', label: 'Security', icon: '🔐' },
  { id: 'ai', label: 'AI/ML', icon: '🤖' },
  { id: 'data', label: 'Data', icon: '📊' },
  { id: 'tool', label: 'Tools', icon: '🛠️' },
];

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f7df1e',
  python: '#3776ab',
  html: '#e34c26',
  powershell: '#5391fe',
  other: '#6e7681',
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

const ProjectGallery: React.FC<Props> = ({ openApp }) => {
  const projects: Project[] = projectsData as Project[];
  const [category, setCategory] = useState('all');

  const getCategoryCount = useCallback(
    (cat: string) => {
      if (cat === 'all') return projects.length;
      return projects.filter((p) => p.category === cat).length;
    },
    [projects]
  );

  const filtered = useMemo(() => {
    return projects
      .filter((p) => category === 'all' || p.category === category)
      .sort((a, b) => {
        if (a.featured !== b.featured) return b.featured ? 1 : -1;
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      });
  }, [projects, category]);

  const openInFirefox = (url: string) => {
    try {
      sessionStorage.setItem('firefox:start-url', url);
    } catch {
      /* ignore */
    }
    openApp?.('firefox');
  };

  return (
    <div className="project-gallery">
      {/* Header with Category Pills */}
      <div className="pg-header-bar">
        <div className="pg-categories" role="tablist" aria-label="Filter by category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={category === cat.id}
              className={`pg-category-pill${category === cat.id ? ' active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              <span className="pg-pill-icon">{cat.icon}</span>
              <span className="pg-pill-label">{cat.label}</span>
              <span className="pg-category-count">{getCategoryCount(cat.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="pg-empty">
          <span className="pg-empty-icon">📁</span>
          <h3 className="pg-empty-title">No projects in this category</h3>
          <button className="pg-empty-reset" onClick={() => setCategory('all')}>
            View All
          </button>
        </div>
      ) : (
        <div className="pg-grid">
          {filtered.map((project, index) => (
            <article
              key={project.id}
              className={`pg-card${project.featured ? ' featured' : ''}`}
              style={{ animationDelay: `${Math.min(index * 0.03, 0.2)}s` }}
            >
              {/* Card Header */}
              <div className="pg-card-header">
                <div className="pg-card-title-row">
                  <div className="pg-card-title-group">
                    <span
                      className="pg-lang-dot"
                      style={{
                        backgroundColor:
                          LANGUAGE_COLORS[project.language] || LANGUAGE_COLORS.other,
                      }}
                      title={project.language}
                    />
                    <h3 className="pg-card-title">{project.title}</h3>
                  </div>
                  {project.featured && (
                    <span className="pg-card-featured-badge">⭐</span>
                  )}
                </div>
                <p className="pg-card-description">{project.description}</p>
              </div>

              {/* Card Body - Tech Stack */}
              <div className="pg-card-body">
                <div className="pg-card-stack">
                  {project.stack.slice(0, 3).map((tech) => (
                    <span key={tech} className="pg-stack-tag">{tech}</span>
                  ))}
                  {project.stack.length > 3 && (
                    <span className="pg-stack-tag pg-stack-more">+{project.stack.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pg-card-footer">
                <div className="pg-card-meta">
                  {project.stars > 0 && (
                    <span className="pg-meta-item" title="Stars">⭐ {project.stars}</span>
                  )}
                  <span className="pg-meta-item" title="Last updated">🕐 {formatDate(project.lastUpdated)}</span>
                </div>
                <div className="pg-card-actions">
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pg-card-btn"
                    aria-label={`View ${project.title} on GitHub`}
                  >
                    <svg className="pg-btn-icon" viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    Code
                  </a>
                  {project.demo && (
                    <button
                      className="pg-card-btn primary"
                      onClick={() => openInFirefox(project.demo)}
                      aria-label={`Open ${project.title} demo`}
                    >
                      Demo
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        Showing {filtered.length} of {projects.length} projects
        {category !== 'all' ? ` in ${category}` : ''}
      </div>
    </div>
  );
};

export default ProjectGallery;
