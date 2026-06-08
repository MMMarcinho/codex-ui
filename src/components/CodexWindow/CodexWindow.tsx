import type { ReactNode } from 'react';
import styles from './CodexWindow.module.css';

export interface CodexWindowProps {
  projectName?: string;
  projectPath?: string;
  children: ReactNode;
  className?: string;
}

export function CodexWindow({
  projectName = 'codex-ui',
  projectPath,
  children,
  className,
}: CodexWindowProps) {
  return (
    <section
      className={[styles.windowShell, className].filter(Boolean).join(' ')}
    >
      <header className={styles.titlebar} aria-label="窗口">
        <div className={styles.trafficLights} aria-hidden="true">
          <span className={[styles.traffic, styles.red].join(' ')} />
          <span className={[styles.traffic, styles.yellow].join(' ')} />
          <span className={[styles.traffic, styles.green].join(' ')} />
        </div>
        <div className={styles.titlebarCenter}>
          <span className={styles.projectName}>{projectName}</span>
          {projectPath && (
            <span className={styles.projectPath}>{projectPath}</span>
          )}
        </div>
        <div />
      </header>
      <div className={styles.windowBody}>{children}</div>
    </section>
  );
}
